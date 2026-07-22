import { Contact as DeviceContact, getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';
import type { CreateContactRecord } from 'expo-contacts';
import type { Contact } from '../types/contact';

async function ensurePermission(): Promise<boolean> {
  const existing = await getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await requestPermissionsAsync();
  return requested.granted;
}

function toDeviceRecord(contact: Contact): CreateContactRecord {
  const noteParts = [contact.notes, contact.tags.length > 0 ? `Tags: ${contact.tags.join(', ')}` : undefined].filter(
    Boolean
  );

  return {
    givenName: contact.firstName,
    familyName: contact.lastName,
    company: contact.organization,
    jobTitle: contact.jobTitle,
    phones: contact.phones.map((p) => ({ label: p.label, number: p.number })),
    emails: contact.emails.map((e) => ({ label: e.label, address: e.address })),
    addresses: contact.addresses.map((a) => ({
      label: a.label,
      street: a.street,
      city: a.city,
      postcode: a.postalCode,
      country: a.country,
    })),
    urlAddresses: contact.website ? [{ label: 'work', url: contact.website }] : undefined,
    // On iOS the note field needs a special Apple-granted entitlement not present in Expo Go —
    // the write is simply ignored there rather than failing the whole sync.
    note: noteParts.length > 0 ? noteParts.join('\n') : undefined,
  };
}

/**
 * Writes a contact into the phone's native address book (iOS Contacts / Android Contacts),
 * updating the previously-created entry if we already have its id instead of duplicating it.
 * @returns the native device-contact id, to be persisted on the Contact so future syncs update in place.
 */
export async function syncContactToDevice(contact: Contact): Promise<string> {
  const granted = await ensurePermission();
  if (!granted) {
    throw new Error('Kein Zugriff auf die Kontakte-App erteilt.');
  }

  const record = toDeviceRecord(contact);

  if (contact.deviceContactId) {
    try {
      await new DeviceContact(contact.deviceContactId).update(record);
      return contact.deviceContactId;
    } catch {
      // The device contact may have been deleted since the last sync — create a fresh one below.
    }
  }

  const created = await DeviceContact.create(record);
  return created.id;
}
