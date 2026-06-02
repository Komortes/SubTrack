import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import i18next from "@/lib/i18n";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { Subscription } from "@/lib/types";

const BACKUP_FILENAME = "subtrack_backup.json";
const BACKUP_PATH = `${FileSystem.documentDirectory}${BACKUP_FILENAME}`;

type BackupFile = {
  version: 1;
  backedUpAt: string;
  subscriptions: Subscription[];
};

export async function writeBackup(): Promise<void> {
  const subscriptions = useSubscriptionStore.getState().subscriptions;
  const backup: BackupFile = {
    version: 1,
    backedUpAt: new Date().toISOString(),
    subscriptions,
  };
  await FileSystem.writeAsStringAsync(BACKUP_PATH, JSON.stringify(backup), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export async function exportBackup(): Promise<void> {
  await writeBackup();
  await Sharing.shareAsync(BACKUP_PATH, {
    mimeType: "application/json",
    dialogTitle: i18next.t("settings.rows.backupNow"),
  });
}

export async function getLastBackupDate(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(BACKUP_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(BACKUP_PATH);
    const parsed: BackupFile = JSON.parse(raw);
    return parsed.backedUpAt;
  } catch {
    return null;
  }
}

export async function restoreFromFile(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return 0;

  const uri = result.assets[0]?.uri;
  if (!uri) throw new Error(i18next.t("backup.restoreError"));

  const raw = await FileSystem.readAsStringAsync(uri);
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
      throw new Error();
    }
  } catch {
    throw new Error(i18next.t("backup.invalidFile"));
  }

  const importResult = await useSubscriptionStore
    .getState()
    .importSubscriptions(parsed.subscriptions);
  return importResult.created + importResult.updated;
}
