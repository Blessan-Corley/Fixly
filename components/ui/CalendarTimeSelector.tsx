'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Clock } from 'lucide-react';

import { buildTimeSlots } from './calendarHelpers';

type CalendarTimeSelectorProps = {
  show: boolean;
  hasDate: boolean;
  selectedTime: string;
  onTimeChange: (time: string) => void;
};

export function CalendarTimeSelector({
  show,
  hasDate,
  selectedTime,
  onTimeChange,
}: CalendarTimeSelectorProps): React.JSX.Element {
  const timeSlots = buildTimeSlots();

  return (
    <AnimatePresence>
      {show && hasDate ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-t border-gray-100"
        >
          <div className="p-6">
            <div className="mb-4 flex items-center space-x-3">
              <Clock className="h-5 w-5 text-fixly-accent" />
              <h5 className="font-medium text-fixly-text">Select Time</h5>
            </div>
            <div className="grid max-h-32 grid-cols-4 gap-2 overflow-y-auto">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => onTimeChange(time)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedTime === time
                      ? 'bg-fixly-accent text-white'
                      : 'text-fixly-text hover:bg-fixly-accent/10'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
