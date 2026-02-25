import React, { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../context/AuthContext.jsx";

const CalendarView = ({ tasks, onDateClick, onEventDrop }) => {
  const { isAdmin } = useAuth();
  const calendarRef = useRef(null);

  const events = tasks.map((t) => ({
    id: t._id,
    title: t.title,
    start: t.start_datetime || t.deadline_datetime,
    end: t.end_datetime || undefined,
    allDay: false,
    extendedProps: t
  }));

  useEffect(() => {
    // Resize calendar when container changes
    const calApi = calendarRef.current?.getApi?.();
    if (calApi) {
      calApi.updateSize();
    }
  }, [tasks]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "today"
        }}
        buttonText={{
          today: "Today",
          prev: "‹",
          next: "›"
        }}
        events={events}
        editable={isAdmin}
        droppable={false}
        eventDrop={(info) => {
          const newDate = info.event.start;
          if (!newDate) return;
          onEventDrop(info.event.id, newDate.toISOString());
        }}
        dateClick={(arg) => onDateClick(arg.dateStr)}
        dayMaxEventRows
      />
    </div>
  );
};

export default CalendarView;

