"use client";

import React from "react";
import { FaTrash } from "react-icons/fa";

type DataObject = {
  id: number;
  name: string;
  description: string;
  objectid: number;
  systemOfRecordId: number;
  model?: any;
};

type SystemOfRecord = {
  id: number;
  name: string;
  icon?: string | null;
};

type DataListProps = {
  dataObjects: DataObject[];
  systemsOfRecord: SystemOfRecord[];
  onDeleteAction: (id: number) => void | Promise<void>;
};

export default function DataList({
  dataObjects,
  systemsOfRecord,
  onDeleteAction,
}: DataListProps) {
  const sorById = new Map(systemsOfRecord.map((s) => [s.id, s]));
  return (
    <div className="space-y-3">
      {dataObjects.length === 0 ? (
        <div className="text-white/70">No data objects yet.</div>
      ) : (
        dataObjects.map((obj) => {
          const sor = sorById.get(obj.systemOfRecordId);
          return (
            <div
              key={obj.id}
              className="p-4 rounded-lg border border-gray-700 bg-[rgb(20,16,60)] text-white flex items-start justify-between"
            >
              <div>
                <div className="text-base font-semibold">{obj.name}</div>
                <div className="text-sm text-white/80 mt-1">
                  {obj.description}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  System of Record:{" "}
                  {sor ? sor.name : `#${obj.systemOfRecordId}`}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => void onDeleteAction(obj.id)}
                  className="btn-secondary w-8"
                  title="Delete data object"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
