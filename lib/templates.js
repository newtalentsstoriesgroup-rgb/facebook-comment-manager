import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToUserDocuments,
} from '@/lib/firestore';
import { logActivity } from '@/lib/activity';

export const TEMPLATES = 'templates';

export const CATEGORIES = {
  reply: 'Gusubiza',
  thanks: 'Gushimira',
  explain: 'Gusobanura',
  info: 'Kongeraho amakuru',
  invite: 'Gutumira ibitekerezo',
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// Ibyitegererezo by'ibanze — wowe ubihindura uko ubishaka. {izina} isimburwa n'izina ry'uwanditse.
export const STARTER_TEMPLATES = [
  {
    category: 'reply',
    title: 'Murakoze kutwandikira',
    text: 'Muraho {izina}! Murakoze kutwandikira. Tuzabasubiza vuba bishoboka.',
  },
  {
    category: 'reply',
    title: 'Ikibazo cy\'ibiciro',
    text: 'Muraho {izina}, ku bijyanye n\'ibiciro, mwatwandikira mu butumwa bwihariye (inbox) tukabaha amakuru arambuye.',
  },
  {
    category: 'thanks',
    title: 'Gushimira igitekerezo',
    text: 'Murakoze cyane {izina} ku bitekerezo byanyu byiza! Biradutera imbaraga zo gukomeza.',
  },
  {
    category: 'thanks',
    title: 'Gushimira gusangiza',
    text: 'Murakoze gusangiza abandi iyi nyandiko, {izina}. Turabashimira.',
  },
  {
    category: 'explain',
    title: 'Gusobanura serivisi',
    text: 'Muraho {izina}. Serivisi yacu ikora ite: [andika ibisobanuro hano]. Niba mufite ibindi bibazo, mutwandikire.',
  },
  {
    category: 'explain',
    title: 'Amasaha y\'akazi',
    text: 'Dukora kuva ku wa mbere kugeza ku wa gatanu, saa mbiri kugeza saa kumi n\'ebyiri. Murakaza neza!',
  },
  {
    category: 'info',
    title: 'Aho tuherereye',
    text: 'Dusanga ku [aderesi]. Mushobora no kuduhamagara kuri [telefoni].',
  },
  {
    category: 'info',
    title: 'Amakuru mashya',
    text: 'Amakuru mashya: [andika amakuru hano]. Mukomeze mudukurikirane kugira ngo mutazacikanwa.',
  },
  {
    category: 'invite',
    title: 'Gutumira abakiriya',
    text: 'Mwiriwe neza! Niba mwaraguze cyangwa mwakoresheje serivisi zacu, twishimira kumva igitekerezo cyanyu bwite hano munsi y\'iyi nyandiko. Ibitekerezo byanyu biradufasha gutera imbere. Murakoze!',
  },
  {
    category: 'invite',
    title: 'Gutumira abakozi n\'inshuti',
    text: 'Muraho bakozi n\'inshuti! Mwandike ku giti cyanyu icyo mutekereza kuri iyi nyandiko, mukoresheje konti zanyu bwite. Murakoze.',
  },
];

export async function createTemplate(uid, { title, text, category }) {
  const id = await createDocument(TEMPLATES, uid, {
    title: title.trim(),
    text: text.trim(),
    category,
  });
  await logActivity(uid, 'template_created', `Yongeyeho icyitegererezo: ${title.trim()}`);
  return id;
}

export async function updateTemplate(uid, id, { title, text, category }) {
  await updateDocument(TEMPLATES, id, { title: title.trim(), text: text.trim(), category });
  await logActivity(uid, 'template_updated', `Yahinduye icyitegererezo: ${title.trim()}`);
}

export async function deleteTemplate(uid, template) {
  await deleteDocument(TEMPLATES, template.id);
  await logActivity(uid, 'template_deleted', `Yasibye icyitegererezo: ${template.title}`);
}

export async function seedStarterTemplates(uid) {
  const batch = writeBatch(db);
  STARTER_TEMPLATES.forEach((t) => {
    batch.set(doc(collection(db, TEMPLATES)), {
      ...t,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  await logActivity(uid, 'template_created', `Yongeyeho ibyitegererezo by'ibanze ${STARTER_TEMPLATES.length}`);
}

export const subscribeTemplates = (uid, onData, onError) =>
  subscribeToUserDocuments(TEMPLATES, uid, onData, onError);

// Isimbuza {izina} n'izina ry'uwanditse (izina rya mbere gusa).
export function fillTemplate(text, name = '') {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return text.replace(/\{izina\}/gi, first).replace(/ +([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
