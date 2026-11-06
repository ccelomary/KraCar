import { coreDb } from "@/lib/kracar/db";
import { command } from "@/lib/kracar/service";
import { localPaymentProvider } from "@/lib/kracar/payment-provider";
import { fail } from "@/lib/api";
import { NextResponse } from "next/server";
export async function POST(req:Request){
  if(process.env.DEMO_MODE!=="true"||process.env.NODE_ENV==="production")return fail("Demo payments are disabled.",403);
  try{const body=await req.text();if(body.length>5000)return fail("Invalid callback.");const event=localPaymentProvider(process.env.DEMO_CALLBACK_SECRET||process.env.SESSION_SECRET||"").verify(body,req.headers.get("x-kracar-signature")||"");
    const invoice=await coreDb().financialDocument.findUniqueOrThrow({where:{id:event.invoiceId}});if(!invoice.customerId)return fail("Invalid customer invoice.");const user=await coreDb().user.findUniqueOrThrow({where:{id:invoice.customerId}});
    return NextResponse.json(await command({id:user.id,email:user.email,name:user.name,role:"customer",permissions:[]},{action:"payment.demo",invoiceId:invoice.id,amount:event.amount,method:"card",reference:event.reference,eventKey:event.id}));
  }catch{return fail("Callback could not be verified or conflicts with the invoice.",400);}
}
