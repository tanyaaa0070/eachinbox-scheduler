import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { parseCsvOrText, CsvParseResult } from '../../utils/csv';
import { UploadCloud, CheckCircle, AlertTriangle, RefreshCw, FileText, Check } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (emails: string[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = parseCsvOrText(content);
        setParseResult(result);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.validEmails.length > 0) {
      onImport(parseResult.validEmails);
      onClose();
      // Reset
      setParseResult(null);
      setFileName(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setParseResult(null);
        setFileName(null);
      }}
      title="Import Email Leads"
      description="Upload a CSV or TXT file to automatically extract and validate recipient emails."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Upload Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,.txt"
            onChange={handleChange}
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 mb-3">
              <UploadCloud className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-slate-400 mt-1">Supports CSV or plain text lists (.csv, .txt)</p>
          </label>
        </div>

        {/* Parsing Intelligence Summary */}
        {parseResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">{fileName}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Detected Column: <strong className="text-slate-800">{parseResult.detectedColumn}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[11px] text-emerald-800 font-medium">Valid Leads</p>
                  <p className="text-lg font-bold text-emerald-700">{parseResult.validEmails.length}</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-[11px] text-amber-800 font-medium">Invalid</p>
                  <p className="text-lg font-bold text-amber-700">{parseResult.invalidEmails.length}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[11px] text-slate-600 font-medium">Duplicates Removed</p>
                  <p className="text-lg font-bold text-slate-800">{parseResult.duplicateCount}</p>
                </div>
              </div>
            </div>

            {/* Sample Preview */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">Sample Parsed Leads (Top 5):</p>
              <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 text-xs font-mono divide-y divide-slate-100">
                {parseResult.validEmails.slice(0, 5).map((em, idx) => (
                  <div key={idx} className="py-1 px-1.5 flex items-center justify-between text-slate-700">
                    <span>{em}</span>
                    <span className="text-[10px] text-emerald-600 font-sans font-medium">Verified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setParseResult(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!parseResult || parseResult.validEmails.length === 0}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Import {parseResult ? `${parseResult.validEmails.length} Leads` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
