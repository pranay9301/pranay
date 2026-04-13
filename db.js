import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";


export const saveInvoice = async (uid, invoiceData) => {
    try {
        const docRef = await addDoc(collection(db, "invoices"), {
            uid,
            ...invoiceData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

export const getUserInvoices = async (uid) => {
    try {
        const q = query(
            collection(db, "invoices"), 
            where("uid", "==", uid),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const invoices = [];
        querySnapshot.forEach((doc) => {
            invoices.push({ id: doc.id, ...doc.data() });
        });
        return invoices;
    } catch (e) {
        console.error("Error getting documents: ", e);
        throw e;
    }
};

export { db };
