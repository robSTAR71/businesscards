import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { contactToVCard, contactsToVCard } from '../utils/vcardExport';
import type { Contact } from '../types/contact';

function safeFileName(contact: Contact): string {
  const base = [contact.firstName, contact.lastName].filter(Boolean).join('_') || contact.organization || 'kontakt';
  return `${base.replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`;
}

async function writeAndShare(fileName: string, vcard: string, dialogTitle: string): Promise<void> {
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, vcard, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/vcard', dialogTitle });
  }
}

/** Shares one contact as a .vcf file — the universal handoff format both Google Contacts and iOS Contacts import. */
export async function shareContact(contact: Contact): Promise<void> {
  await writeAndShare(safeFileName(contact), contactToVCard(contact), 'Kontakt teilen');
}

/** Bulk backup/export of every stored contact as a single multi-entry .vcf file. */
export async function shareAllContacts(contacts: Contact[]): Promise<void> {
  await writeAndShare('alle_kontakte.vcf', contactsToVCard(contacts), 'Alle Kontakte teilen');
}
