import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { buildCsv } from './logic';

// Writes the CSV to the app's cache folder, then opens the phone's share sheet so the tester can send it.
export async function exportCsvFile(setup, log) {
  const path = FileSystem.cacheDirectory + 'putter-test-results.csv';
  await FileSystem.writeAsStringAsync(path, buildCsv(setup, log));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export results',
    });
  }
}
