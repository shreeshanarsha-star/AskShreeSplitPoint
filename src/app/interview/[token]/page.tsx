"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  useEffect(() => {
    if (token) {
      router.replace(`/candidate/prescreen?token=${encodeURIComponent(token)}`);
    }
  }, [token, router]);

  return (
    <div className="h-screen w-full bg-page flex items-center justify-center">
      <div className="animate-spin text-brand text-2xl">✨</div>
    </div>
  );
}
