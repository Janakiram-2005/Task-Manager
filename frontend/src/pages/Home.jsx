import React, { useEffect, useState } from "react";
import api from "../services/api";
import CalendarView from "../components/CalendarView.jsx";
import TaskCard from "../components/TaskCard.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Home = () => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
      setFilteredTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredTasks(tasks);
      return;
    }
    const q = search.toLowerCase();
    setFilteredTasks(
      tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      )
    );
  }, [search, tasks]);

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleEventDrop = async (id, newIso) => {
    if (!isAdmin) return;
    try {
      const res = await api.put(`/tasks/${id}`, {
        deadline_datetime: newIso
      });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error("Failed to reschedule", err);
    }
  };

  const handleComplete = async (task) => {
    try {
      const res = await api.put(`/tasks/complete/${task._id}`);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data : t)));
    } catch (err) {
      console.error("Failed to complete", err);
    }
  };

  const handleDelete = async (task) => {
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const upcoming = [...tasks]
    .filter((t) => new Date(t.deadline_datetime) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.deadline_datetime).getTime() -
        new Date(b.deadline_datetime).getTime()
    )
    .slice(0, 5);

  const tasksForSelectedDate = selectedDate
    ? tasks.filter((t) => t.deadline_datetime.startsWith(selectedDate))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Secure Academic Task Calendar
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Public calendar view. Use Admin Mode to modify tasks.
          </p>
        </div>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalendarView
            tasks={filteredTasks}
            onDateClick={handleDateClick}
            onEventDrop={handleEventDrop}
          />
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Upcoming deadlines</h2>
            <div className="space-y-2">
              {upcoming.length === 0 && (
                <p className="text-xs text-slate-500">
                  No upcoming deadlines.
                </p>
              )}
              {upcoming.map((t) => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
          {selectedDate && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">
                Tasks on {selectedDate}
              </h2>
              <div className="space-y-2">
                {tasksForSelectedDate.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No tasks on this date.
                  </p>
                )}
                {tasksForSelectedDate.map((t) => (
                  <TaskCard
                    key={t._id}
                    task={t}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {loading && (
        <p className="text-xs text-slate-500">Loading tasks from server...</p>
      )}
    </div>
  );
};

export default Home;

