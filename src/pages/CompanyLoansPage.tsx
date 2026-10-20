import { Link, useParams } from "react-router-dom";
import { CompanyFrame } from "@/components/drill";
import { Panel } from "@/components/ui";
import { inrCr } from "@/lib/demoData";
import { entityLoans } from "@/lib/drillData";
import { sparksForEntity } from "@/lib/loanFile";

export function CompanyLoansPage() {
  const { entityId = "" } = useParams();
  const loans = entityLoans(entityId);
  const named = sparksForEntity(entityId);
  return (
    <CompanyFrame entityId={entityId} page="Loans & Notes">
      <Panel title="Facilities" subtitle="Open a lender for the loan file." bleed>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Lender</th>
                <th>Type</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Rate</th>
                <th className="text-right">EMI</th>
                <th>Maturity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <Link to={`/loans/${loan.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {loan.lender}
                    </Link>
                  </td>
                  <td>{loan.type}</td>
                  <td className="text-right tabular-nums">{inrCr(loan.outstanding)}</td>
                  <td className="text-right tabular-nums">{loan.rate.toFixed(2)}%</td>
                  <td className="text-right tabular-nums">{inrCr(loan.emi)}</td>
                  <td>{loan.maturity}</td>
                  <td>{loan.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {named.length > 0 ? (
        <Panel title="Named facilities" subtitle="Open a file for the lender, asset, and amortization." bleed>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Asset</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right">LTV</th>
                </tr>
              </thead>
              <tbody>
                {named.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <Link to={`/loans/${file.id}`} className="font-semibold underline-offset-2 hover:underline">{file.name}</Link>
                    </td>
                    <td>{file.asset}</td>
                    <td className="text-right tabular-nums">{inrCr(file.outstanding)}</td>
                    <td className="text-right tabular-nums">{file.ltv.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </CompanyFrame>
  );
}
