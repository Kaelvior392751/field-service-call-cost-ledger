const response = await fetch("http://localhost:3000/work-orders/inspect", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    workOrderId: "WO-1042",
    issue: "Outdoor condenser is running, but the classroom remains warm.",
    photoUrls: ["https://example.com/work-orders/WO-1042/condenser.jpg"],
    dispatchStatus: "awaiting_review",
  }),
});

console.log(await response.json());

export {};
