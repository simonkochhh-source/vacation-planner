import React, { useState, useMemo } from 'react';
import { Trip } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '../../utils';

interface TripDateRangeCalendarProps {
  selectedTrip: Trip;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

const TripDateRangeCalendar: React.FC<TripDateRangeCalendarProps> = ({
  selectedTrip,
  selectedDate,
  onDateSelect,
  onValidationChange
}) => {
  const tripStartDate = new Date(selectedTrip.startDate);
  const tripEndDate = new Date(selectedTrip.endDate);
  
  // Initialize current month to trip start month
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(tripStartDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    // Generate 42 days (6 weeks) for the calendar grid
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isInTripRange = current >= tripStartDate && current <= tripEndDate;
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      days.push({
        date: new Date(current),
        dateStr,
        day: current.getDate(),
        isCurrentMonth,
        isInTripRange,
        isSelected,
        isToday,
        isSelectable: isCurrentMonth && isInTripRange
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, tripStartDate, tripEndDate, selectedDate]);

  // Check if selected date is valid
  const isDateValid = useMemo(() => {
    if (!selectedDate) return false;
    const date = new Date(selectedDate);
    const isValid = date >= tripStartDate && date <= tripEndDate;
    onValidationChange(isValid);
    return isValid;
  }, [selectedDate, tripStartDate, tripEndDate, onValidationChange]);

  const handleDateClick = (day: typeof calendarData[0]) => {
    if (day.isSelectable) {
      onDateSelect(day.dateStr);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const goToTripMonth = () => {
    setCurrentMonth(new Date(tripStartDate.getFullYear(), tripStartDate.getMonth(), 1));
  };

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Trip Info and Validation Status */}
      <div style={{
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isDateValid ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
        border: `1px solid ${isDateValid ? 'var(--color-success)' : 'var(--color-warning)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
      }}>
        {isDateValid ? (
          <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
        ) : (
          <AlertCircle size={20} style={{ color: 'var(--color-warning)' }} />
        )}
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>
            Reisezeitraum: {formatDate(selectedTrip.startDate)} - {formatDate(selectedTrip.endDate)}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {isDateValid 
              ? `✅ Gewähltes Datum (${formatDate(selectedDate)}) liegt im Reisezeitraum`
              : selectedDate 
                ? `⚠️ Gewähltes Datum liegt außerhalb des Reisezeitraums`
                : '📅 Bitte wählen Sie einen Tag aus dem Reisezeitraum'
            }
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 var(--space-sm)'
      }}>
        <button
          onClick={() => navigateMonth('prev')}
          style={{
            padding: 'var(--space-sm)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)'
          }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          
          {/* Quick jump to trip month */}
          {(currentMonth.getMonth() !== tripStartDate.getMonth() || 
            currentMonth.getFullYear() !== tripStartDate.getFullYear()) && (
            <button
              onClick={goToTripMonth}
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)'
              }}
            >
              <CalendarIcon size={12} />
              Zur Reise
            </button>
          )}
        </div>

        <button
          onClick={() => navigateMonth('next')}
          style={{
            padding: 'var(--space-sm)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        backgroundColor: 'var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}>
        {/* Week day headers */}
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              padding: 'var(--space-sm)',
              backgroundColor: 'var(--color-background-alt)',
              textAlign: 'center',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)'
            }}
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(day)}
            disabled={!day.isSelectable}
            style={{
              padding: 'var(--space-sm)',
              backgroundColor: day.isSelected 
                ? 'var(--color-primary)' 
                : day.isInTripRange && day.isCurrentMonth
                  ? 'var(--color-primary-bg)'
                  : 'var(--color-surface)',
              color: day.isSelected
                ? 'white'
                : day.isInTripRange && day.isCurrentMonth
                  ? 'var(--color-primary)'
                  : day.isCurrentMonth
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
              border: 'none',
              cursor: day.isSelectable ? 'pointer' : 'not-allowed',
              fontSize: 'var(--text-sm)',
              fontWeight: day.isToday ? 'var(--font-weight-semibold)' : 'normal',
              position: 'relative',
              opacity: day.isCurrentMonth ? 1 : 0.5,
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={
              day.isInTripRange && day.isCurrentMonth
                ? `${day.day}. - Verfügbarer Reisetag`
                : day.isCurrentMonth
                  ? `${day.day}. - Außerhalb des Reisezeitraums`
                  : `${day.day}.`
            }
          >
            {day.day}
            {day.isToday && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: day.isSelected ? 'white' : 'var(--color-primary)'
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-lg)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--color-primary-bg)',
            borderRadius: '2px'
          }} />
          Verfügbare Reisetage
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--color-primary)',
            borderRadius: '2px'
          }} />
          Ausgewählter Tag
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '2px',
            border: '1px solid var(--color-border)'
          }} />
          Nicht verfügbar
        </div>
      </div>
    </div>
  );
};

export default TripDateRangeCalendar;