// Retired with the gym locator; retained as an explicit response for older clients.
export function GET() {
 return Response.json({error:'The gym locator has been retired. Explore Learn & improve in Social for workout and nutrition articles.'},{status:410})
}
