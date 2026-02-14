import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, isToday, isYesterday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const currentDate = new Date(date);

  const prevDate = () => {
    onChange(format(addDays(currentDate, -1), "yyyy-MM-dd"));
  };

  const nextDate = () => {
    onChange(format(addDays(currentDate, 1), "yyyy-MM-dd"));
  };

  const onSelect = (d: Date | undefined) => {
    if (d) {
      onChange(format(d, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  let formattedDate = format(currentDate, "EEEE, d. MMM", { locale: de });
  if (isToday(currentDate)) formattedDate = "Heute";
  if (isYesterday(currentDate)) formattedDate = "Gestern";
  if (isTomorrow(currentDate)) formattedDate = "Morgen";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-t bg-background/95 backdrop-blur z-40 supports-[backdrop-filter]:bg-background/60",
        className,
      )}>
      <Button variant="ghost" size="icon" onClick={prevDate}>
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous day</span>
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="font-semibold text-base min-w-[140px] tabular-nums">
            {formattedDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={onSelect}
            initialFocus
            locale={de}
          />
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={nextDate}>
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next day</span>
      </Button>
    </div>
  );
}
