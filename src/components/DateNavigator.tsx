import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, isToday, isYesterday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateNavigatorProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
}

export function DateNavigator({
  date,
  onChange,
  className,
}: DateNavigatorProps) {
  const currentDate = new Date(date);

  const prevDate = () => {
    onChange(format(addDays(currentDate, -1), "yyyy-MM-dd"));
  };

  const nextDate = () => {
    onChange(format(addDays(currentDate, 1), "yyyy-MM-dd"));
  };

  let formattedDate = format(currentDate, "EEEE, d. MMM", { locale: de });
  if (isToday(currentDate)) formattedDate = "Heute";
  if (isYesterday(currentDate)) formattedDate = "Gestern";
  if (isTomorrow(currentDate)) formattedDate = "Morgen";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur z-40 supports-backdrop-filter:bg-background/60",
        className,
      )}>
      <Button variant="ghost" size="icon" onClick={prevDate}>
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous day</span>
      </Button>

      <label className="relative inline-flex items-center justify-center min-w-35">
        <Button
          variant="ghost"
          className="font-semibold text-base min-w-35 tabular-nums">
          {formattedDate}
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          aria-label="Datum auswählen"
        />
      </label>

      <Button variant="ghost" size="icon" onClick={nextDate}>
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next day</span>
      </Button>
    </div>
  );
}
