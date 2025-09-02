"use client";

import React from "react";
import Link from "next/link";

type ErrorScreenProps = {
  message: string;
};

export default function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-app-screen">
      <div className="text-red-500 mb-4">{message}</div>
      <Link href="/" className="interactive-button">
        Back to Home
      </Link>
    </div>
  );
}
