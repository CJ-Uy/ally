import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getInstalledApps, type InstalledApp, DEFAULT_BLOCKED_PACKAGES } from "../../modules/app-blocker";
import { loadBlockedList, saveBlockedList } from "../lib/blocked-list";

interface Props {
  onClose: () => void;
  onSaved?: (packages: string[]) => void;
}

export default function AppPickerScreen({ onClose, onSaved }: Props) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const list = getInstalledApps();
        setApps(list);
        const stored = await loadBlockedList();
        setSelected(new Set(stored));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      if (!showSystem && a.isSystem && !selected.has(a.packageName)) return false;
      if (!q) return true;
      return (
        a.label.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
      );
    });
  }, [apps, query, showSystem, selected]);

  const toggle = (pkg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const onSave = async () => {
    const list = Array.from(selected);
    await saveBlockedList(list);
    onSaved?.(list);
    onClose();
  };

  const onResetDefaults = () => {
    setSelected(new Set(DEFAULT_BLOCKED_PACKAGES));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Blocked Apps</Text>
        <TouchableOpacity onPress={onSave} hitSlop={10}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>{selected.size} apps selected</Text>
        <TouchableOpacity onPress={onResetDefaults} hitSlop={10}>
          <Text style={styles.linkText}>Reset to recommended</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search apps..."
        placeholderTextColor="#8fa3c0"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.systemToggle}
        onPress={() => setShowSystem((s) => !s)}
      >
        <View style={[styles.checkbox, showSystem && styles.checkboxOn]}>
          {showSystem && <Text style={styles.check}>✓</Text>}
        </View>
        <Text style={styles.systemToggleText}>Show system apps</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4a6fa5" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.packageName}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const on = selected.has(item.packageName);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => toggle(item.packageName)}
                activeOpacity={0.6}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.rowPkg} numberOfLines={1}>{item.packageName}</Text>
                </View>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Text style={styles.check}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No apps match your search.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ee",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1e2a3d" },
  cancelText: { fontSize: 15, color: "#6b7a93", fontWeight: "500" },
  saveText: { fontSize: 15, color: "#4a6fa5", fontWeight: "700" },

  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subText: { fontSize: 13, color: "#6b7a93", fontWeight: "500" },
  linkText: { fontSize: 13, color: "#4a6fa5", fontWeight: "600" },

  search: {
    marginHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e2a3d",
    borderWidth: 1,
    borderColor: "#dde5ee",
  },

  systemToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  systemToggleText: { fontSize: 13, color: "#6b7a93" },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sep: { height: 1, backgroundColor: "#dde5ee" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: "#1e2a3d" },
  rowPkg: { fontSize: 11, color: "#8fa3c0", fontFamily: "monospace" },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#caddec",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkboxOn: { backgroundColor: "#4a6fa5", borderColor: "#4a6fa5" },
  check: { color: "#ffffff", fontSize: 14, fontWeight: "700" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#6b7a93", marginTop: 40, fontSize: 14 },
});
