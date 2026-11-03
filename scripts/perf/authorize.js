import http from "k6/http";
import { check, fail } from "k6";
import { Trend } from "k6/metrics";

const baseUrl = (__ENV.API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const rate = Number(__ENV.RATE ?? 200);
const duration = __ENV.DURATION ?? "2m";
const amount = __ENV.AMOUNT ?? "1.00";

export const authorizeQueryCount = new Trend("authorize_query_count");

export const options = {
  scenarios: {
    authorize: {
      executor: "constant-arrival-rate",
      rate,
      timeUnit: "1s",
      duration,
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS ?? Math.max(20, Math.ceil(rate / 2))),
      maxVUs: Number(__ENV.MAX_VUS ?? Math.max(100, rate * 2)),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

export function setup() {
  const login = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({
      email: __ENV.PERF_EMAIL ?? "budi@amanahlink.test",
      password: __ENV.PERF_PASSWORD ?? "password",
    }),
    { headers: { Accept: "application/json", "Content-Type": "application/json" } },
  );

  if (login.status !== 200) {
    fail(`Login fixture gagal: HTTP ${login.status} ${login.body}`);
  }

  const token = login.json("data.token");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  const campaigns = http.get(`${baseUrl}/campaigns/mine`, { headers });
  const merchants = http.get(`${baseUrl}/merchants?mcc=5912`, { headers });
  const campaign = campaigns.json("data.0");
  const merchant = merchants.json("data.0");

  if (campaigns.status !== 200 || !campaign?.id) {
    fail(`Campaign fixture tidak tersedia: HTTP ${campaigns.status} ${campaigns.body}`);
  }

  if (merchants.status !== 200 || !merchant?.id) {
    fail(`Merchant fixture tidak tersedia: HTTP ${merchants.status} ${merchants.body}`);
  }

  return { token, campaignId: campaign.id, merchantId: merchant.id };
}

export default function authorize(fixture) {
  const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const response = http.post(
    `${baseUrl}/disbursements`,
    JSON.stringify({
      campaign_id: fixture.campaignId,
      merchant_id: fixture.merchantId,
      amount,
    }),
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${fixture.token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      tags: { endpoint: "authorize" },
    },
  );

  const queryCount = Number(response.headers["X-Perf-Query-Count"] ?? 0);
  if (queryCount > 0) authorizeQueryCount.add(queryCount);

  check(response, {
    "authorize returns 201": (result) => result.status === 201,
    "authorize returns captured": (result) => result.json("data.status") === "captured",
  });
}
