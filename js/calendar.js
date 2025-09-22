import { WEEKDAY_LABELS } from './constants.js';
import { aggregateCounts, formatCountLabel, formatDateKey } from './helpers.js';

export class CalendarView {
  constructor(container, { onSelectDate } = {}) {
    this.container = container;
    this.onSelectDate = onSelectDate;
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth();
    this.entriesByDate = new Map();
    this.selectedDate = '';
    this.cellTemplate = document.getElementById('calendarCellTemplate');
    this.cells = new Map();
  }

  setMonth(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
    this.render();
  }

  setEntries(entriesMap) {
    this.entriesByDate = new Map(entriesMap);
    this.render();
  }

  setSelectedDate(dateKey) {
    this.selectedDate = dateKey;
    this.updateSelection();
  }

  getYearMonth() {
    return { year: this.currentYear, month: this.currentMonth };
  }

  render() {
    this.container.innerHTML = '';
    this.cells.clear();
    WEEKDAY_LABELS.forEach((label) => {
      const header = document.createElement('div');
      header.textContent = label;
      header.className = 'weekday-label';
      this.container.appendChild(header);
    });

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    for (let i = 0; i < startWeekday; i += 1) {
      const filler = document.createElement('div');
      filler.className = 'calendar-cell placeholder';
      filler.setAttribute('aria-hidden', 'true');
      filler.tabIndex = -1;
      this.container.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateKey = formatDateKey(date);
      const entries = this.entriesByDate.get(dateKey) ?? [];
      const counts = aggregateCounts(entries);
      const cell = this.createCell(dateKey, day, counts);
      this.container.appendChild(cell);
      this.cells.set(dateKey, cell);
    }

    const totalCells = this.container.children.length;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
      for (let i = remainder; i < 7; i += 1) {
        const filler = document.createElement('div');
        filler.className = 'calendar-cell placeholder';
        filler.setAttribute('aria-hidden', 'true');
        filler.tabIndex = -1;
        this.container.appendChild(filler);
      }
    }

    this.updateSelection();
  }

  createCell(dateKey, day, counts) {
    const templateContent = this.cellTemplate.content.firstElementChild.cloneNode(true);
    const dateLabel = templateContent.querySelector('.date-label');
    const countLabel = templateContent.querySelector('.count-label');
    dateLabel.textContent = day;
    countLabel.textContent = formatCountLabel(counts);
    templateContent.dataset.date = dateKey;
    templateContent.addEventListener('click', () => {
      this.handleSelect(dateKey);
    });
    return templateContent;
  }

  updateSelection() {
    this.cells.forEach((cell, key) => {
      if (key === this.selectedDate) {
        cell.classList.add('selected');
        cell.setAttribute('aria-pressed', 'true');
      } else {
        cell.classList.remove('selected');
        cell.removeAttribute('aria-pressed');
      }
    });
  }

  updateCell(dateKey, entries) {
    const cell = this.cells.get(dateKey);
    if (!cell) {
      return;
    }
    const counts = aggregateCounts(entries);
    const countLabel = cell.querySelector('.count-label');
    if (countLabel) {
      countLabel.textContent = formatCountLabel(counts);
    }
  }

  handleSelect(dateKey) {
    this.selectedDate = dateKey;
    this.updateSelection();
    if (typeof this.onSelectDate === 'function') {
      this.onSelectDate(dateKey);
    }
  }
}
