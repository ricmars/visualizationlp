"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSearch } from "react-icons/fa";
import StandardModal from "./StandardModal";

interface Object {
  id: number;
  name: string;
  description: string;
  hasWorkflow: boolean;
  isEmbedded: boolean;
}

interface ObjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (object: Object) => void;
  applicationId?: number;
}

export default function ObjectSelectorModal({
  isOpen,
  onClose,
  onSelect,
  applicationId,
}: ObjectSelectorModalProps) {
  const [objects, setObjects] = useState<Object[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<Object[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch objects when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchObjects();
      setSearchTerm("");
      setSelectedIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, applicationId]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter objects based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredObjects(objects);
    } else {
      const filtered = objects.filter(
        (obj) =>
          obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obj.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredObjects(filtered);
    }
    setSelectedIndex(0);
  }, [searchTerm, objects]);

  const fetchObjects = async (): Promise<void> => {
    setLoading(true);
    try {
      let url = "/api/database?table=Objects";
      if (applicationId) {
        url += `&applicationid=${applicationId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        const fetchedObjects = result.data || [];
        setObjects(fetchedObjects);
        setFilteredObjects(fetchedObjects);
      } else {
        console.error("Failed to fetch objects");
        setObjects([]);
        setFilteredObjects([]);
      }
    } catch (error) {
      console.error("Error fetching objects:", error);
      setObjects([]);
      setFilteredObjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredObjects.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredObjects.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredObjects[selectedIndex]) {
          handleSelect(filteredObjects[selectedIndex]);
        }
        break;
    }
  };

  const handleSelect = (object: Object): void => {
    onSelect(object);
    onClose();
  };

  const handleMouseEnter = (index: number): void => {
    setSelectedIndex(index);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  return (
    <StandardModal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Select Object"
      width="w-full max-w-md"
      onKeyDownAction={handleKeyDown}
    >
      {/* Search Input */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search objects..."
          className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Object List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            Loading objects...
          </div>
        ) : filteredObjects.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            {searchTerm
              ? "No objects found matching your search."
              : "No objects available."}
          </div>
        ) : (
          <div ref={listRef} className="py-2">
            {filteredObjects.map((object, index) => (
              <button
                key={object.id}
                onClick={() => handleSelect(object)}
                onMouseEnter={() => handleMouseEnter(index)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                  index === selectedIndex ? "bg-gray-700" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {object.name}
                    </div>
                    <div className="text-sm text-gray-300 truncate mt-1">
                      {object.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {object.hasWorkflow && (
                      <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded">
                        Workflow
                      </span>
                    )}
                    {object.isEmbedded && (
                      <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                        Embedded
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400">
        Use ↑↓ to navigate, Enter to select, Esc to close
      </div>
    </StandardModal>
  );
}
