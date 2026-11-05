"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app";
import { MentorForm } from "@/components/mentor-form";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/api";

export default function MentorEdit() {
  const { fail } = useApp();
  const [m, setM] = useState<any>(undefined);
  useEffect(() => { api("/api/miniapp/mentor").then((r) => setM(r.mentor)).catch(fail); }, [fail]);
  if (m === undefined) return <Skeleton n={3} />;
  return <MentorForm initial={m} />;
}
