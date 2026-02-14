import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  open: boolean;
}

export function BarcodeScanner({ onScan, onClose, open }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "html5qr-code-full-region";

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanner = async () => {
    try {
      if (!window.isSecureContext) {
        setError(
          "Kamera benötigt HTTPS oder localhost. Bitte sichere Verbindung nutzen.",
        );
        return;
      }

      if (scannerRef.current) {
        // Already running?
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      stream.getTracks().forEach((track) => track.stop());

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
      ];

      // Prefer back camera
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Ignore parse errors as we listen continuously
        },
      );
    } catch (err: unknown) {
      console.error("Failed to start scanner", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Kamera-Zugriff wurde blockiert. Bitte Browser-Berechtigung erlauben.",
        );
        return;
      }
      if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("Keine Kamera gefunden.");
        return;
      }
      setError("Kamera konnte nicht gestartet werden.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
      scannerRef.current = null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
      <DialogContent className="p-0 border-none bg-black text-white w-full h-[100dvh] max-w-none flex flex-col items-center justify-center [&>button]:hidden">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full h-10 w-10 bg-white/20 text-white hover:bg-white/30 backdrop-blur"
            onClick={onClose}>
            <X className="h-6 w-6" />
            <span className="sr-only">Schließen</span>
          </Button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-lg font-medium">{error}</p>
            <Button variant="secondary" onClick={onClose}>
              Zurück zur Eingabe
            </Button>
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col justify-center bg-black">
            {/* The library mounts the video element here */}
            <div id={containerId} className="w-full bg-black" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-2 border-primary/50 w-64 h-64 rounded-xl z-20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Scan region overlay */}
            </div>

            <div className="absolute bottom-12 inset-x-0 text-center pointer-events-none z-30">
              <div className="inline-flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur text-sm font-medium">
                <Camera className="h-4 w-4" />
                Barcode scannen
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
