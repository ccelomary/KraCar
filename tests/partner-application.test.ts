import { test } from "node:test";
import assert from "node:assert/strict";
import { documentType, partnerSchema } from "../src/lib/partner-application";
const application = {
  name: "Example Mobility",
  owner: "Example Owner",
  email: "OWNER@example.com",
  phone: "+212 600000000",
  whatsapp: "+212 600000001",
  city: "Agadir",
  category: "cars",
  registration: "RC-1234",
  fleetSize: "5",
  description: "A synthetic application for a local mobility business.",
  authority: "on",
  consent: "on",
};
test("partner applications normalize email and capacity and require both declarations", () => {
  const result = partnerSchema.parse(application);
  assert.equal(result.email, "owner@example.com");
  assert.equal(result.fleetSize, 5);
  for (const changes of [
    { authority: "" },
    { consent: "" },
    { city: "Unknown" },
    { category: "other" },
    { fleetSize: "0" },
    { phone: "+212" },
  ])
    assert.equal(
      partnerSchema.safeParse({ ...application, ...changes }).success,
      false,
    );
});
test("registration uploads use signatures instead of trusting filenames", () => {
  assert.equal(documentType(Buffer.from("%PDF-1.7\n")), "application/pdf");
  assert.equal(documentType(Buffer.from([255, 216, 255, 224])), "image/jpeg");
  assert.equal(
    documentType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(
    documentType(Buffer.from("<script>alert('not a PDF')</script>")),
    null,
  );
  assert.equal(documentType(Buffer.alloc(0)), null);
});
