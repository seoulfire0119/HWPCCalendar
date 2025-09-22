import { DEPARTMENT_ID } from './constants.js';
import { entriesToString, stringToEntries } from './helpers.js';

const LOCAL_STORAGE_KEY = 'hwpc-calendar-entries';

let firestoreInstance = null;
let firestoreFns = null;
let useFirestore = false;

async function loadFirebase() {
  if (firestoreInstance) {
    return firestoreInstance;
  }
  if (typeof window === 'undefined' || !window.firebaseConfig) {
    return null;
  }

  const appModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js').catch((error) => {
    console.warn('Firebase App 모듈을 불러오지 못했습니다.', error);
    return null;
  });
  if (!appModule) {
    return null;
  }

  const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js').catch((error) => {
    console.warn('Firebase Firestore 모듈을 불러오지 못했습니다.', error);
    return null;
  });
  if (!firestoreModule) {
    return null;
  }

  const app = appModule.initializeApp(window.firebaseConfig);
  firestoreInstance = firestoreModule.getFirestore(app);
  firestoreFns = {
    doc: firestoreModule.doc,
    getDoc: firestoreModule.getDoc,
    setDoc: firestoreModule.setDoc,
    deleteDoc: firestoreModule.deleteDoc,
    serverTimestamp: firestoreModule.serverTimestamp,
    collection: firestoreModule.collection,
    getDocs: firestoreModule.getDocs,
    query: firestoreModule.query,
    where: firestoreModule.where,
  };
  return firestoreInstance;
}

export async function initializeDataStore() {
  const instance = await loadFirebase();
  useFirestore = Boolean(instance);
  return useFirestore;
}

function buildDocId(dateKey) {
  return `${dateKey}_${DEPARTMENT_ID}`;
}

function readLocalEntries() {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn('로컬 저장소를 불러오는 중 오류가 발생했습니다.', error);
    return {};
  }
}

function writeLocalEntries(data) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

export async function fetchEntriesForMonth(year, month) {
  const prefix = `${year}-${`${month + 1}`.padStart(2, '0')}`;
  if (useFirestore && firestoreInstance && firestoreFns) {
    const result = new Map();
    const { collection, query, where, getDocs } = firestoreFns;
    const collectionRef = collection(firestoreInstance, 'memos');
    const q = query(collectionRef, where('department', '==', DEPARTMENT_ID));
    try {
      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (!id.startsWith(prefix)) {
          return;
        }
        const content = docSnap.data()?.content ?? '';
        const entries = stringToEntries(content);
        const dateKey = id.replace(`_${DEPARTMENT_ID}`, '');
        result.set(dateKey, entries);
      });
      return result;
    } catch (error) {
      console.warn('Firestore 데이터를 불러오지 못했습니다.', error);
    }
  }

  const stored = readLocalEntries();
  return Object.keys(stored)
    .filter((key) => key.startsWith(prefix))
    .reduce((map, key) => {
      map.set(key, stringToEntries(stored[key]));
      return map;
    }, new Map());
}

export async function saveEntriesForDate(dateKey, entries) {
  if (useFirestore && firestoreInstance && firestoreFns) {
    const { doc, setDoc, deleteDoc, serverTimestamp } = firestoreFns;
    const docRef = doc(firestoreInstance, 'memos', buildDocId(dateKey));
    if (entries.length === 0) {
      await deleteDoc(docRef);
      return;
    }
    await setDoc(docRef, {
      content: entriesToString(entries),
      department: DEPARTMENT_ID,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const stored = readLocalEntries();
  if (entries.length === 0) {
    delete stored[dateKey];
  } else {
    stored[dateKey] = entriesToString(entries);
  }
  writeLocalEntries(stored);
}
