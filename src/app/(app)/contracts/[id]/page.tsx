import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ContractEditor } from "../contract-editor";

export const metadata: Metadata = { title: "Contract" };

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("owner", "office_staff");
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, contract_no, body, created_at, projects (id, project_no)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const project = Array.isArray(contract.projects) ? contract.projects[0] : contract.projects;

  return (
    <>
      <TopBar
        title={contract.contract_no}
        backHref={project ? `/projects/${project.id}` : "/projects"}
      />
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Created {formatDate(contract.created_at)}
            {project && (
              <>
                {" · "}
                <Link href={`/projects/${project.id}`} className="text-brand-green-dark underline">
                  {project.project_no}
                </Link>
              </>
            )}
          </p>
          <a
            href={`/api/contracts/${contract.id}/pdf`}
            target="_blank"
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white"
          >
            Download PDF
          </a>
        </div>
      </div>
      <ContractEditor contractId={contract.id} initialBody={contract.body} />
    </>
  );
}
