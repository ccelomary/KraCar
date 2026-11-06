import { getCustomerAuth } from "@/lib/kracar/auth";
export const GET = (req: Request) => getCustomerAuth().handler(req);
export const POST = (req: Request) => getCustomerAuth().handler(req);
