import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import type { CertificateItem } from "../lib/certificates";
import { apiUrl } from "../lib/auth";

export function CertificateVerificationPage() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState<CertificateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(apiUrl(`/api/certificates/verify/${certificateId}`))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Certificate not found");
        setCertificate(data.certificate);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Verification failed"))
      .finally(() => setLoading(false));
  }, [certificateId]);

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
        <Card className="p-8 text-center">
          {loading && <Skeleton className="mx-auto h-64 max-w-xl" />}
          {!loading && error && (
            <>
              <XCircle className="mx-auto h-14 w-14 text-rose-600" />
              <h1 className="mt-5 text-3xl font-black">Certificate Not Verified</h1>
              <p className="mt-3 text-slate-500">{error}</p>
            </>
          )}
          {!loading && certificate && (
            <>
              <ShieldCheck className="mx-auto h-14 w-14 text-emerald-600" />
              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-indigo-500">Verified Credential</p>
              <h1 className="mt-3 text-4xl font-black">{certificate.recipientName}</h1>
              <p className="mt-3 text-lg font-bold text-slate-600">{certificate.award}</p>
              <div className="mx-auto mt-8 grid max-w-xl gap-3 rounded-3xl bg-white/70 p-5 text-left sm:grid-cols-2">
                <Info label="Certificate ID" value={certificate.certificateId} />
                <Info label="Event" value={certificate.eventName} />
                <Info label="Team" value={certificate.teamName || "Individual"} />
                <Info label="Category" value={certificate.category} />
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Signature hash matched
              </div>
            </>
          )}
          <Link to="/certificates" className="mt-8 inline-flex text-sm font-black text-indigo-600">Back to certificates</Link>
        </Card>
      </motion.div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}
