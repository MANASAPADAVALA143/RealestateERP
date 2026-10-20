import { useParams } from "react-router-dom";
import { InsuranceRisk } from "@/components/InsuranceRisk";
import { CompanyFrame } from "@/components/drill";

export function CompanyInsurancePage() {
  const { entityId = "" } = useParams();
  return (
    <CompanyFrame entityId={entityId} page="Insurance">
      <InsuranceRisk entityId={entityId} />
    </CompanyFrame>
  );
}
