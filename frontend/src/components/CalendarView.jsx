import React, { useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../context/AuthContext.jsx";

// Priority → color mapping
const PRIORITY_COLOR = {
  High: "#ef4444",  // red-500
  Medium: "#f59e0b",  // amber-500
  Low: "#22c55e",  // green-500
};

const CalendarView = ({ tasks, onDateClick, onEventDrop }) => {
  const { isAdmin } = useAuth();
  const calendarRef = useRef(null);

  const events = tasks.map((t) => {
    const hasValidStart = t.start_datetime && t.start_datetime !== t.deadline_datetime;
    return {
      id: t._id,
      title: t.title,
      start: t.start_datetime || t.deadline_datetime,
      end: hasValidStart ? t.deadline_datetime : undefined,
      allDay: false,
      extendedProps: { ...t },
      color: PRIORITY_COLOR[t.priority] || PRIORITY_COLOR.Medium,
    };
  });

  useEffect(() => {
    const calApi = calendarRef.current?.getApi?.();
    if (calApi) calApi.updateSize();
  }, [tasks]);

  // Slim left-border line renderer
  const renderEvent = (info) => {
    const color = PRIORITY_COLOR[info.event.extendedProps.priority] || "#60a5fa";
    return (
      <div
        style={{
          borderLeft: `3px solid ${color}`,
          paddingLeft: "5px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          background: "transparent",
          fontSize: "11px",
          lineHeight: "1.5",
          cursor: "pointer",
        }}
        title={info.event.title}
      >
        {info.event.title}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        headerToolbar={{ left: "prev,next", center: "title", right: "today" }}
        buttonText={{ today: "Today" }}
        events={events}
        eventContent={renderEvent}
        eventBackgroundColor="transparent"
        eventBorderColor="transparent"
        editable={isAdmin}
        droppable={false}
        eventDrop={(info) => {
          if (!info.event.start) return;
          onEventDrop(info.event.id, info.event.start.toISOString());
        }}
        dateClick={(arg) => onDateClick(arg.dateStr)}
        dayMaxEventRows={4}
      />
    </div>
  );
};

export default CalendarView;
