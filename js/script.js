import { CENTERS, DUTY_TYPES, INCIDENT_TYPES } from './constants.js';
import { CalendarView } from './calendar.js';
import {
  describeEntry,
  formatDateKey,
  formatEntryString,
  sortEntries,
} from './helpers.js';
import { fetchEntriesForMonth, initializeDataStore, saveEntriesForDate } from './firebase.js';

const state = {
  calendar: null,
  selectedDate: '',
  entriesByDate: new Map(),
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  setupSelectOptions();
  setupEventHandlers();
  handleDutyTypeChange();

  state.calendar = new CalendarView(elements.calendarGrid, {
    onSelectDate: handleDateSelection,
  });

  const today = new Date();
  const { year, month } = { year: today.getFullYear(), month: today.getMonth() };

  await initializeDataStore();
  await loadMonth(year, month);

  const todayKey = formatDateKey(today);
  const firstDayKey = formatDateKey(new Date(year, month, 1));
  const initialKey = state.entriesByDate.has(todayKey) ? todayKey : firstDayKey;
  state.calendar.setSelectedDate(initialKey);
  handleDateSelection(initialKey);
});

function cacheElements() {
  elements.calendarGrid = document.getElementById('calendarGrid');
  elements.monthLabel = document.getElementById('monthLabel');
  elements.prevMonth = document.getElementById('prevMonth');
  elements.nextMonth = document.getElementById('nextMonth');
  elements.selectedDateLabel = document.getElementById('selectedDateLabel');
  elements.openModalButton = document.getElementById('openModalButton');
  elements.modal = document.getElementById('entryModal');
  elements.modalDateLabel = document.getElementById('modalDateLabel');
  elements.closeModalButton = document.getElementById('closeModal');
  elements.centerSelect = document.getElementById('centerSelect');
  elements.nameInput = document.getElementById('nameInput');
  elements.incidentTypeSelect = document.getElementById('incidentTypeSelect');
  elements.dutyTypeSelect = document.getElementById('dutyTypeSelect');
  elements.startTime = document.getElementById('startTime');
  elements.endTime = document.getElementById('endTime');
  elements.timeRow = document.getElementById('timeRow');
  elements.entryForm = document.getElementById('entryForm');
  elements.modalEntryList = document.getElementById('modalEntryList');
  elements.sideEntryList = document.getElementById('sideEntryList');
}

function setupSelectOptions() {
  CENTERS.forEach((center) => {
    const option = document.createElement('option');
    option.value = center;
    option.textContent = center;
    elements.centerSelect.append(option);
  });

  INCIDENT_TYPES.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    elements.incidentTypeSelect.append(option);
  });

  DUTY_TYPES.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type === '기타' ? '기타(시간기반)' : type;
    elements.dutyTypeSelect.append(option);
  });
}

function setupEventHandlers() {
  elements.prevMonth.addEventListener('click', () => {
    void changeMonth(-1);
  });
  elements.nextMonth.addEventListener('click', () => {
    void changeMonth(1);
  });
  elements.openModalButton.addEventListener('click', openModal);
  elements.closeModalButton.addEventListener('click', closeModal);
  elements.modal.querySelector('[data-dismiss]').addEventListener('click', closeModal);
  elements.dutyTypeSelect.addEventListener('change', handleDutyTypeChange);
  elements.entryForm.addEventListener('submit', handleEntrySubmit);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen()) {
      closeModal();
    }
  });
}

async function changeMonth(offset) {
  const { year, month } = state.calendar.getYearMonth();
  const target = new Date(year, month + offset, 1);
  await loadMonth(target.getFullYear(), target.getMonth());
  const firstDayKey = formatDateKey(target);
  state.calendar.setSelectedDate(firstDayKey);
  handleDateSelection(firstDayKey);
}

async function loadMonth(year, month) {
  const entriesMap = await fetchEntriesForMonth(year, month);
  const normalized = new Map();
  entriesMap.forEach((entries, key) => {
    normalized.set(key, sortEntries(entries));
  });
  state.entriesByDate = normalized;
  state.calendar.setMonth(year, month);
  state.calendar.setEntries(normalized);
  updateMonthLabel(year, month);
}

function updateMonthLabel(year, month) {
  elements.monthLabel.textContent = `${year}년 ${month + 1}월`;
}

function handleDateSelection(dateKey) {
  if (!dateKey) {
    return;
  }
  state.selectedDate = dateKey;
  const formatted = dateKey.replace(/-/g, '.');
  elements.selectedDateLabel.textContent = `${formatted} 일정`;
  elements.openModalButton.disabled = false;
  renderEntryLists();
}

function openModal() {
  if (!state.selectedDate) {
    return;
  }
  elements.modalDateLabel.textContent = state.selectedDate.replace(/-/g, '.');
  elements.modal.setAttribute('aria-hidden', 'false');
  elements.modal.classList.add('active');
  elements.nameInput.focus();
  renderModalList();
}

function closeModal() {
  elements.modal.setAttribute('aria-hidden', 'true');
  elements.modal.classList.remove('active');
  elements.entryForm.reset();
  handleDutyTypeChange();
}

function isModalOpen() {
  return elements.modal.getAttribute('aria-hidden') === 'false';
}

function handleDutyTypeChange() {
  const isTimeBased = elements.dutyTypeSelect.value === '기타';
  elements.startTime.disabled = !isTimeBased;
  elements.endTime.disabled = !isTimeBased;
  elements.startTime.required = isTimeBased;
  elements.endTime.required = isTimeBased;
  if (!isTimeBased) {
    elements.startTime.value = '';
    elements.endTime.value = '';
  }
}

async function handleEntrySubmit(event) {
  event.preventDefault();
  if (!state.selectedDate) {
    return;
  }

  const center = elements.centerSelect.value;
  const name = elements.nameInput.value.trim();
  const incidentType = elements.incidentTypeSelect.value;
  const dutyType = elements.dutyTypeSelect.value;
  const startTime = elements.startTime.value;
  const endTime = elements.endTime.value;

  if (!center || !name || !incidentType || !dutyType) {
    elements.entryForm.reportValidity();
    return;
  }

  let timeRange = '';
  if (dutyType === '기타') {
    if (!startTime || !endTime) {
      elements.entryForm.reportValidity();
      return;
    }
    timeRange = `${startTime}~${endTime}`;
  }

  let entryString;
  try {
    entryString = formatEntryString({ center, name, dutyType, incidentType, timeRange });
  } catch (error) {
    alert(error.message);
    return;
  }

  const existing = state.entriesByDate.get(state.selectedDate) ?? [];
  const nextEntries = sortEntries([...existing, entryString]);
  state.entriesByDate.set(state.selectedDate, nextEntries);
  await persistDateEntries(state.selectedDate, nextEntries);
  state.calendar.updateCell(state.selectedDate, nextEntries);
  renderEntryLists();
  renderModalList();
  elements.entryForm.reset();
  handleDutyTypeChange();
  elements.centerSelect.focus();
}

function renderEntryLists() {
  const entries = state.entriesByDate.get(state.selectedDate) ?? [];
  renderList(elements.sideEntryList, entries, { showDelete: false });
}

function renderModalList() {
  const entries = state.entriesByDate.get(state.selectedDate) ?? [];
  renderList(elements.modalEntryList, entries, { showDelete: true });
}

function renderList(container, entries, { showDelete }) {
  container.innerHTML = '';
  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'entry-item empty';
    empty.textContent = '등록된 항목이 없습니다.';
    container.append(empty);
    return;
  }

  entries.forEach((entryString, index) => {
    const template = document.getElementById('entryListItemTemplate');
    const node = template.content.firstElementChild.cloneNode(true);
    const { centerLabel, name, meta, time } = describeEntry(entryString);
    node.querySelector('.center-badge').textContent = centerLabel;
    node.querySelector('.entry-name').textContent = name;
    node.querySelector('.entry-meta').textContent = meta;
    const timeEl = node.querySelector('.entry-time');
    if (time) {
      timeEl.textContent = time;
    } else {
      timeEl.textContent = '';
    }

    const deleteButton = node.querySelector('.delete-button');
    if (!showDelete) {
      deleteButton.remove();
    } else {
      deleteButton.addEventListener('click', () => {
        void removeEntry(index);
      });
    }
    container.append(node);
  });
}

async function removeEntry(index) {
  const entries = state.entriesByDate.get(state.selectedDate) ?? [];
  if (!entries[index]) {
    return;
  }
  const nextEntries = entries.filter((_, i) => i !== index);
  if (nextEntries.length === 0) {
    state.entriesByDate.delete(state.selectedDate);
  } else {
    state.entriesByDate.set(state.selectedDate, nextEntries);
  }
  await persistDateEntries(state.selectedDate, nextEntries);
  state.calendar.updateCell(state.selectedDate, nextEntries);
  renderEntryLists();
  renderModalList();
}

async function persistDateEntries(dateKey, entries) {
  try {
    await saveEntriesForDate(dateKey, entries);
  } catch (error) {
    console.error('저장 중 문제가 발생했습니다.', error);
    alert('저장 중 문제가 발생했습니다. 다시 시도해주세요.');
  }
}
