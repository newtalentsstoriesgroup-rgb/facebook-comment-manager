import { where, getDocs, query, collection } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  batchDelete,
  subscribeToUserDocuments,
} from '@/lib/firestore';
import { logActivity } from '@/lib/activity';

export const POSTS = 'posts';

export async function createPost(uid, { postUrl, postId, title, description }) {
  const id = await createDocument(POSTS, uid, {
    postUrl: postUrl.trim(),
    postId: (postId || '').trim(),
    title: (title || '').trim(),
    description: (description || '').trim(),
  });
  await logActivity(uid, 'post_created', `Yongeyeho inyandiko: ${(title || postUrl).trim()}`);
  return id;
}

export async function updatePost(uid, id, { postUrl, postId, title, description }) {
  await updateDocument(POSTS, id, {
    postUrl: postUrl.trim(),
    postId: (postId || '').trim(),
    title: (title || '').trim(),
    description: (description || '').trim(),
  });
  await logActivity(uid, 'post_updated', `Yahinduye inyandiko: ${(title || postUrl).trim()}`);
}

// Isiba inyandiko hamwe n'ibitekerezo byayo byose.
export async function deletePost(uid, post) {
  const snap = await getDocs(
    query(
      collection(db, 'comments'),
      where('userId', '==', uid),
      where('postId', '==', post.id)
    )
  );
  await batchDelete(
    'comments',
    snap.docs.map((d) => d.id)
  );
  await deleteDocument(POSTS, post.id);
  await logActivity(
    uid,
    'post_deleted',
    `Yasibye inyandiko: ${post.title || post.postUrl} (n'ibitekerezo ${snap.size})`
  );
}

export const subscribePosts = (uid, onData, onError) =>
  subscribeToUserDocuments(POSTS, uid, onData, onError);
