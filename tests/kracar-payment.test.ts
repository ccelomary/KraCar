import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {demoSignature,localPaymentProvider,liveProviders} from "../src/lib/kracar/payment-provider";
test("demo payment callbacks require a valid signature and strict server event fields",()=>{
  const secret="test-callback-secret-with-32-plus-characters",provider=localPaymentProvider(secret);
  const body=JSON.stringify({id:randomUUID(),invoiceId:"invoice-1",amount:35000,reference:"SIMULATED",status:"succeeded"});
  assert.equal(provider.verify(body,demoSignature(body,secret)).amount,35000);
  assert.throws(()=>provider.verify(body,"bad"));assert.throws(()=>provider.verify(body.replace("35000","35001"),demoSignature(body,secret)));
  assert.equal(liveProviders.payzone.enabled,false);assert.equal(liveProviders.cashplus.enabled,false);
});
