import CustomersTable from "@/app/ui/customers/table";
import Search from "@/app/ui/search";
import { Suspense } from "react";
import { CustomersTableSkeleton } from "@/app/ui/skeletons";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Customers',
};

export default async function Page(props: {
  searchParams: Promise<{ query?: string }>
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  
  return (
    <div className="w-full">
      <Suspense fallback={<CustomersTableSkeleton />}>
        <CustomersTable query={query}></CustomersTable>
      </Suspense>
    </div>
  )
}