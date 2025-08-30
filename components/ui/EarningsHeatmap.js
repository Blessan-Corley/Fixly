'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Briefcase, DollarSign, TrendingUp, Info } from 'lucide-react';

export default function EarningsHeatmap({ jobsData = [], year = new Date().getFullYear() }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  // Process jobs data into daily aggregates
  const dailyData = useMemo(() => {
    const dataMap = new Map();
    
    jobsData.forEach(job => {
      if (!job.progress?.completedAt) return;
      
      const completedDate = new Date(job.progress.completedAt);
      if (completedDate.getFullYear() !== year) return;
      
      const dateKey = completedDate.toISOString().split('T')[0];
      
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: dateKey,
          jobs: [],
          totalEarnings: 0,
          jobCount: 0
        });
      }
      
      const dayData = dataMap.get(dateKey);
      dayData.jobs.push(job);
      dayData.totalEarnings += job.budget?.amount || 0;
      dayData.jobCount += 1;
    });
    
    return dataMap;
  }, [jobsData, year]);

  // Get intensity level based on job count (0-4 scale)
  const getIntensity = (jobCount) => {
    if (jobCount === 0) return 0;
    if (jobCount <= 1) return 1;
    if (jobCount <= 3) return 2;
    if (jobCount <= 5) return 3;
    return 4;
  };

  // Generate calendar grid for the year
  const generateCalendar = () => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const weeks = [];
    
    let currentDate = new Date(startDate);
    // Start from the first Sunday of the grid
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    while (currentDate <= endDate || weeks.length < 53) {
      const week = [];
      
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = dailyData.get(dateStr);
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          isCurrentYear: currentDate.getFullYear() === year,
          dayData: dayData || { jobCount: 0, totalEarnings: 0, jobs: [] }
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
      
      if (currentDate > endDate && week.every(day => !day.isCurrentYear || day.date > endDate)) {
        break;
      }
    }
    
    return weeks;
  };

  const calendar = generateCalendar();

  const handleCellHover = (cellData, event) => {
    if (!cellData.isCurrentYear) return;
    
    setHoveredCell(cellData);
    setTooltipData({
      date: cellData.date,
      jobCount: cellData.dayData.jobCount,
      totalEarnings: cellData.dayData.totalEarnings,
      jobs: cellData.dayData.jobs,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
    setTooltipData(null);
  };

  const handleCellClick = (cellData) => {
    if (!cellData.isCurrentYear || cellData.dayData.jobCount === 0) return;
    setSelectedDate(cellData);
  };

  const intensityColors = {
    0: 'bg-gray-100',
    1: 'bg-green-200',
    2: 'bg-green-300',
    3: 'bg-green-500',
    4: 'bg-green-600'
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalJobs = jobsData.length;
  const totalEarnings = jobsData.reduce((sum, job) => sum + (job.budget?.amount || 0), 0);
  const averageDaily = totalJobs > 0 ? (totalEarnings / Math.max(dailyData.size, 1)) : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-fixly-text flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-fixly-accent" />
            Job Completion Heatmap - {year}
          </h3>
          <p className="text-sm text-fixly-text-muted mt-1">
            {totalJobs} jobs completed • {formatCurrency(totalEarnings)} earned
          </p>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-fixly-text-muted">Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${intensityColors[level]} border border-gray-200`}
              />
            ))}
            <span className="text-fixly-text-muted">More</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="relative">
        {/* Month labels */}
        <div className="flex mb-2">
          <div className="w-8" /> {/* Space for weekday labels */}
          {months.map((month, index) => (
            <div key={month} className="flex-1 text-xs text-fixly-text-muted text-center">
              {month}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex">
          {/* Weekday labels */}
          <div className="flex flex-col mr-2">
            {weekdays.map((day, index) => (
              <div key={day} className="h-3 mb-1 text-xs text-fixly-text-muted flex items-center">
                {index % 2 === 0 ? day.slice(0, 3) : ''}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex space-x-1" style={{ minWidth: '800px' }}>
              {calendar.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col space-y-1">
                  {week.map((day, dayIndex) => {
                    const intensity = day.isCurrentYear ? getIntensity(day.dayData.jobCount) : 0;
                    const isSelected = selectedDate?.dateStr === day.dateStr;
                    const isHovered = hoveredCell?.dateStr === day.dateStr;
                    
                    return (
                      <motion.div
                        key={day.dateStr}
                        className={`
                          w-3 h-3 rounded-sm border cursor-pointer transition-all duration-200
                          ${day.isCurrentYear ? intensityColors[intensity] : 'bg-gray-50'}
                          ${day.isCurrentYear ? 'border-gray-200 hover:border-fixly-accent' : 'border-gray-100'}
                          ${isSelected ? 'ring-2 ring-fixly-accent ring-offset-1' : ''}
                          ${isHovered ? 'scale-110 shadow-lg' : ''}
                          ${!day.isCurrentYear ? 'opacity-30' : ''}
                        `}
                        onMouseEnter={(e) => handleCellHover(day, e)}
                        onMouseLeave={handleCellLeave}
                        onClick={() => handleCellClick(day)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-fixly-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-fixly-text">{totalJobs}</div>
          <div className="text-sm text-fixly-text-muted">Total Jobs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(averageDaily)}</div>
          <div className="text-sm text-fixly-text-muted">Avg per Day</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-fixly-accent">{dailyData.size}</div>
          <div className="text-sm text-fixly-text-muted">Active Days</div>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(tooltipData.x + 10, window.innerWidth - 250),
              top: Math.max(tooltipData.y - 10, 50)
            }}
          >
            <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-xs">
              <div className="font-medium text-sm mb-2">
                {tooltipData.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              
              {tooltipData.jobCount > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Jobs completed:</span>
                    <span className="font-medium">{tooltipData.jobCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total earned:</span>
                    <span className="font-medium text-green-400">
                      {formatCurrency(tooltipData.totalEarnings)}
                    </span>
                  </div>
                  {tooltipData.jobs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-300">Recent:</div>
                      <div className="text-xs text-gray-400 truncate">
                        {tooltipData.jobs[0].title}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No jobs completed</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Date Details */}
      <AnimatePresence>
        {selectedDate && selectedDate.dayData.jobCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-4 border-t border-fixly-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-fixly-text">
                Jobs completed on {selectedDate.date.toLocaleDateString()}
              </h4>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-fixly-text-muted hover:text-fixly-text"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedDate.dayData.jobs.map((job, index) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-fixly-text text-sm">{job.title}</div>
                    <div className="text-xs text-fixly-text-muted">
                      {job.createdBy?.name} • {job.location?.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(job.budget?.amount || 0)}
                    </div>
                    {job.completion?.rating && (
                      <div className="text-xs text-fixly-text-muted">
                        ⭐ {job.completion.rating}/5
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}