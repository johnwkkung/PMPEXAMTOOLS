import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useAlert } from '@/template';
import { getLogFilePath } from '@/services/logService';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import EnhancedMatchingQuestion, { type EnhancedMatchingData } from '@/components/ui/EnhancedMatchingQuestion';
import DropDownQuestion, { type DropDownQuestionData } from '@/components/ui/DropDownQuestion';
import PointClickQuestion, { type PointClickData } from '@/components/ui/PointClickQuestion';
import BurnDownMatchQuestion, { type BurnDownMatchData } from '@/components/ui/BurnDownMatchQuestion';

export default function DebugLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const [logContent, setLogContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [qtestLoading, setQtestLoading] = useState(false);
  const [qtestResult, setQtestResult] = useState<string | null>(null);
  const [emData, setEmData] = useState<EnhancedMatchingData | null>(null);
  const [showEm, setShowEm] = useState(false);
  const [ddLoading, setDdLoading] = useState(false);
  const [ddData, setDdData] = useState<DropDownQuestionData | null>(null);
  const [showDd, setShowDd] = useState(false);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptData, setPtData] = useState<PointClickData | null>(null);
  const [showPt, setShowPt] = useState(false);
  const [bdLoading, setBdLoading] = useState(false);
  const [bdData, setBdData] = useState<BurnDownMatchData | null>(null);
  const [showBd, setShowBd] = useState(false);

  const logPath = getLogFilePath();

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const info = await FileSystem.getInfoAsync(logPath);
      if (!info.exists) {
        setLogContent('(log file does not exist yet)');
      } else {
        const content = await FileSystem.readAsStringAsync(logPath);
        setLogContent(content.trim() || '(log file is empty)');
      }
      setLastRefreshed(new Date());
    } catch (err) {
      setLogContent(`Error reading log:\n${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [logPath]);

  // Load on mount
  React.useEffect(() => {
    loadLog();
  }, [loadLog]);



  const handleClearLog = () => {
    showAlert('清除日誌', '確定要清除所有 API 呼叫記錄？此操作無法復原。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await FileSystem.writeAsStringAsync(logPath, '');
            setLogContent('(log file is empty)');
            setLastRefreshed(new Date());
          } catch (err) {
            showAlert('錯誤', `無法清除日誌：${String(err)}`);
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const formatTime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Parse log into entries separated by '---'
  const entries = logContent
    ? logContent
        .split('---')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
        .reverse() // newest first
    : [];

  const isEmpty =
    !logContent ||
    logContent === '(log file is empty)' ||
    logContent === '(log file does not exist yet)';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <MaterialIcons name="bug-report" size={18} color={Colors.error} />
          <Text style={styles.headerTitleText}>API Testing</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>
        <Pressable
          onPress={loadLog}
          style={styles.refreshBtn}
          disabled={loading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialIcons name="refresh" size={22} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Qtest Button Bar */}
      <View style={styles.qtestBar}>
        {/* EnhMatch button — calls QTST005 */}
        <Pressable
          style={({ pressed }) => [
            styles.qtestBtn,
            { backgroundColor: '#00838F' },
            bdLoading ? { opacity: 0.7 } : null,
            pressed && !bdLoading ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
          ]}
          onPress={async () => {
            setBdLoading(true);
            setBdData(null);
            try {
              const res = await fetch('https://passaexam.kinitify.com/functions/quizManager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'QTST005', user_id: 'johnwkkung', password: 'scLOsT4u4s+t+aVZtrHufY967cURdI1yoiQLD7eiQljAmoFkg5NpOzfPvCtjKwuiuhcYWixLNoXod5asLHOzDoVWyNClhHphUWChkg==' }),
              });
              const text = await res.text();
              try {
                const parsed = JSON.parse(text);
                const rawQ =
                  parsed?.data?.PMPTEST?.[0] ??
                  parsed?.data ??
                  parsed;
                if (rawQ && rawQ.QUESTION && rawQ.CORRECT) {
                  const newBdData: BurnDownMatchData = {
                    QUESTION: String(rawQ.QUESTION),
                    ANS1: rawQ.ANS1 ? String(rawQ.ANS1) : '',
                    ANS2: rawQ.ANS2 ? String(rawQ.ANS2) : null,
                    ANS3: rawQ.ANS3 ? String(rawQ.ANS3) : null,
                    ANS4: rawQ.ANS4 ? String(rawQ.ANS4) : null,
                    ANS5: rawQ.ANS5 ? String(rawQ.ANS5) : null,
                    ANS6: rawQ.ANS6 ? String(rawQ.ANS6) : null,
                    AIMG1: rawQ.AIMG1 ? String(rawQ.AIMG1) : '',
                    AIMG2: rawQ.AIMG2 ? String(rawQ.AIMG2) : null,
                    AIMG3: rawQ.AIMG3 ? String(rawQ.AIMG3) : null,
                    AIMG4: rawQ.AIMG4 ? String(rawQ.AIMG4) : null,
                    AIMG5: rawQ.AIMG5 ? String(rawQ.AIMG5) : null,
                    AIMG6: rawQ.AIMG6 ? String(rawQ.AIMG6) : null,
                    CORRECT: String(rawQ.CORRECT),
                    QIMG: rawQ.QIMG ? String(rawQ.QIMG) : null,
                    EXPLAIN: rawQ.EXPLAIN ? String(rawQ.EXPLAIN) : null,
                    QTYPE: rawQ.QTYPE ? String(rawQ.QTYPE) : null,
                  };
                  setBdData(newBdData);
                  setTimeout(() => setShowBd(true), 50);
                } else {
                  showAlert('EnhMatch', `No question data found.\n\nHTTP ${res.status}`);
                }
              } catch {
                showAlert('EnhMatch', `HTTP ${res.status}\n${text.slice(0, 200)}`);
              }
            } catch (e) {
              showAlert('EnhMatch Error', String(e));
            } finally {
              setBdLoading(false);
            }
          }}
          disabled={bdLoading}
        >
          {bdLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <MaterialIcons name="trending-down" size={16} color="#fff" />}
          <Text style={styles.qtestBtnText}>EnhMatch</Text>
        </Pressable>

      {/* PtClick button — calls QTST004 */}
        <Pressable
          style={({ pressed }) => [
            styles.qtestBtn,
            { backgroundColor: '#00695C' },
            ptLoading ? { opacity: 0.7 } : null,
            pressed && !ptLoading ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
          ]}
          onPress={async () => {
            setPtLoading(true);
            setPtData(null);
            try {
              const res = await fetch('https://passaexam.kinitify.com/functions/quizManager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'QTST004', user_id: 'johnwkkung', password: 'scLOsT4u4s+t+aVZtrHufY967cURdI1yoiQLD7eiQljAmoFkg5NpOzfPvCtjKwuiuhcYWixLNoXod5asLHOzDoVWyNClhHphUWChkg==' }),
              });
              const text = await res.text();
              try {
                const parsed = JSON.parse(text);
                const rawQ =
                  parsed?.data?.PMPTEST?.[0] ??
                  parsed?.data ??
                  parsed;
                if (rawQ && rawQ.QUESTION && rawQ.CORRECT) {
                  const newPtData: PointClickData = {
                    QUESTION: String(rawQ.QUESTION),
                    ANS1: rawQ.ANS1 ? String(rawQ.ANS1) : '',
                    ANS2: rawQ.ANS2 ? String(rawQ.ANS2) : null,
                    ANS3: rawQ.ANS3 ? String(rawQ.ANS3) : null,
                    ANS4: rawQ.ANS4 ? String(rawQ.ANS4) : null,
                    ANS5: rawQ.ANS5 ? String(rawQ.ANS5) : null,
                    ANS6: rawQ.ANS6 ? String(rawQ.ANS6) : null,
                    CORRECT: String(rawQ.CORRECT),
                    QIMG: rawQ.QIMG ? String(rawQ.QIMG) : null,
                    EXPLAIN: rawQ.EXPLAIN ? String(rawQ.EXPLAIN) : null,
                    QTYPE: rawQ.QTYPE ? String(rawQ.QTYPE) : null,
                  };
                  setPtData(newPtData);
                  setTimeout(() => setShowPt(true), 50);
                } else {
                  showAlert('PtClick', `No question data found.\n\nHTTP ${res.status}`);
                }
              } catch {
                showAlert('PtClick', `HTTP ${res.status}\n${text.slice(0, 200)}`);
              }
            } catch (e) {
              showAlert('PtClick Error', String(e));
            } finally {
              setPtLoading(false);
            }
          }}
          disabled={ptLoading}
        >
          {ptLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <MaterialIcons name="scatter-plot" size={16} color="#fff" />}
          <Text style={styles.qtestBtnText}>PtClick</Text>
        </Pressable>

        {/* DropDn button — calls QTST003 */}
        <Pressable
          style={({ pressed }) => [
            styles.qtestBtn,
            { backgroundColor: '#6A1B9A' },
            ddLoading ? { opacity: 0.7 } : null,
            pressed && !ddLoading ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
          ]}
          onPress={async () => {
            setDdLoading(true);
            setDdData(null);
            try {
              const res = await fetch('https://passaexam.kinitify.com/functions/quizManager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'QTST003', user_id: 'johnwkkung', password: 'scLOsT4u4s+t+aVZtrHufY967cURdI1yoiQLD7eiQljAmoFkg5NpOzfPvCtjKwuiuhcYWixLNoXod5asLHOzDoVWyNClhHphUWChkg==' }),
              });
              const text = await res.text();
              try {
                const parsed = JSON.parse(text);
                const rawQ =
                  parsed?.data?.PMPTEST?.[0] ??
                  parsed?.data ??
                  parsed;
                if (rawQ && rawQ.QUESTION && rawQ.CORRECT) {
                  const newDdData: DropDownQuestionData = {
                    QUESTION: String(rawQ.QUESTION),
                    ANS1: rawQ.ANS1 ? String(rawQ.ANS1) : '',
                    ANS2: rawQ.ANS2 ? String(rawQ.ANS2) : null,
                    ANS3: rawQ.ANS3 ? String(rawQ.ANS3) : null,
                    ANS4: rawQ.ANS4 ? String(rawQ.ANS4) : null,
                    ANS5: rawQ.ANS5 ? String(rawQ.ANS5) : null,
                    ANS6: rawQ.ANS6 ? String(rawQ.ANS6) : null,
                    CORRECT: String(rawQ.CORRECT),
                    QIMG: rawQ.QIMG ? String(rawQ.QIMG) : null,
                    EXPLAIN: rawQ.EXPLAIN ? String(rawQ.EXPLAIN) : null,
                    QTYPE: rawQ.QTYPE ? String(rawQ.QTYPE) : null,
                  };
                  setDdData(newDdData);
                  setTimeout(() => setShowDd(true), 50);
                } else {
                  showAlert('DropDn', `No question data found in response.\n\nHTTP ${res.status}`);
                }
              } catch {
                showAlert('DropDn', `HTTP ${res.status}\n${text.slice(0, 200)}`);
              }
            } catch (e) {
              showAlert('DropDn Error', String(e));
            } finally {
              setDdLoading(false);
            }
          }}
          disabled={ddLoading}
        >
          {ddLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <MaterialIcons name="arrow-drop-down-circle" size={16} color="#fff" />}
          <Text style={styles.qtestBtnText}>DropDn</Text>
        </Pressable>



        <Pressable
          style={({ pressed }) => [
            styles.qtestBtn,
            qtestLoading ? { opacity: 0.7 } : null,
            pressed && !qtestLoading ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
          ]}
          onPress={async () => {
            setQtestLoading(true);
            setQtestResult(null);
            setEmData(null);
            try {
              const res = await fetch('https://passaexam.kinitify.com/functions/quizManager', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'QTST001', user_id: 'johnwkkung', password: 'scLOsT4u4s+t+aVZtrHufY967cURdI1yoiQLD7eiQljAmoFkg5NpOzfPvCtjKwuiuhcYWixLNoXod5asLHOzDoVWyNClhHphUWChkg==' }),
              });
              const text = await res.text();
              setQtestResult(`HTTP ${res.status}\n${text.slice(0, 800)}${text.length > 800 ? '...(truncated)' : ''}`);
              // Try to parse as enhanced matching question
              try {
                const parsed = JSON.parse(text);
                // API returns { data: { PMPTEST: [{ ... }] } }
                const rawQ =
                  parsed?.data?.PMPTEST?.[0] ??
                  parsed?.data ??
                  parsed;
                if (rawQ && rawQ.QUESTION && rawQ.CORRECT) {
                  const newEmData: EnhancedMatchingData = {
                    QUESTION: String(rawQ.QUESTION),
                    ANS1: rawQ.ANS1 ? String(rawQ.ANS1) : '',
                    ANS2: rawQ.ANS2 ? String(rawQ.ANS2) : null,
                    ANS3: rawQ.ANS3 ? String(rawQ.ANS3) : null,
                    ANS4: rawQ.ANS4 ? String(rawQ.ANS4) : null,
                    ANS5: rawQ.ANS5 ? String(rawQ.ANS5) : null,
                    ANS6: rawQ.ANS6 ? String(rawQ.ANS6) : null,
                    AIMG1: rawQ.AIMG1 ? String(rawQ.AIMG1) : '',
                    AIMG2: rawQ.AIMG2 ? String(rawQ.AIMG2) : null,
                    AIMG3: rawQ.AIMG3 ? String(rawQ.AIMG3) : null,
                    AIMG4: rawQ.AIMG4 ? String(rawQ.AIMG4) : null,
                    CORRECT: String(rawQ.CORRECT),
                    QIMG: rawQ.QIMG ? String(rawQ.QIMG) : null,
                    EXPLAIN: rawQ.EXPLAIN ? String(rawQ.EXPLAIN) : null,
                    QTYPE: rawQ.QTYPE ? String(rawQ.QTYPE) : null,
                  };
                  setEmData(newEmData);
                  setTimeout(() => setShowEm(true), 50);
                }
              } catch { /* not JSON or missing fields, just show raw */ }
            } catch (e) {
              setQtestResult(`Error: ${String(e)}`);
            } finally {
              setQtestLoading(false);
            }
          }}
          disabled={qtestLoading}
        >
          {qtestLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="science" size={16} color="#fff" />
          )}
          <Text style={styles.qtestBtnText}>Qtest</Text>
        </Pressable>
        {qtestResult ? (
          <Pressable onPress={() => setQtestResult(null)} style={styles.qtestResultClear}>
            <MaterialIcons name="close" size={14} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Qtest Result */}
      {qtestResult ? (
        <View style={styles.qtestResultBox}>
          <Text style={styles.qtestResultText} selectable>{qtestResult}</Text>
          {emData ? (
            <Pressable
              style={styles.openEmBtn}
              onPress={() => setShowEm(true)}
            >
              <MaterialIcons name="extension" size={14} color="#fff" />
              <Text style={styles.openEmBtnText}>Open Enhanced Matching Question</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* BurnDown Match Question Modal */}
      <Modal
        visible={showBd}
        animationType="slide"
        onRequestClose={() => setShowBd(false)}
        statusBarTranslucent
      >
        <View style={[styles.emModal, { paddingTop: insets.top }]}>
          <View style={styles.emModalHeader}>
            <Text style={styles.emModalTitle}>QTST005 — Enhanced Matching (Burndown)</Text>
            <Pressable
              onPress={() => setShowBd(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.emModalClose}
            >
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          {bdData ? (
            <BurnDownMatchQuestion
              key={bdData.CORRECT + (bdData.ANS1 ?? '') + (bdData.AIMG1 ?? '')}
              data={bdData}
              onClose={() => setShowBd(false)}
            />
          ) : null}
        </View>
      </Modal>

      {/* DropDown Question Modal */}
      <Modal
        visible={showDd}
        animationType="slide"
        onRequestClose={() => setShowDd(false)}
        statusBarTranslucent
      >
        <View style={[styles.emModal, { paddingTop: insets.top }]}>
          <View style={styles.emModalHeader}>
            <Text style={styles.emModalTitle}>QTST003 — Drop Down Question</Text>
            <Pressable
              onPress={() => setShowDd(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.emModalClose}
            >
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          {ddData ? (
            <DropDownQuestion
              key={ddData.CORRECT + (ddData.ANS1 ?? '') + (ddData.ANS6 ?? '')}
              data={ddData}
              onClose={() => setShowDd(false)}
            />
          ) : null}
        </View>
      </Modal>

      {/* PointClick Question Modal */}
      <Modal
        visible={showPt}
        animationType="slide"
        onRequestClose={() => setShowPt(false)}
        statusBarTranslucent
      >
        <View style={[styles.emModal, { paddingTop: insets.top }]}>
          <View style={styles.emModalHeader}>
            <Text style={styles.emModalTitle}>QTST004 — Point Click</Text>
            <Pressable
              onPress={() => setShowPt(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.emModalClose}
            >
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          {ptData ? (
            <PointClickQuestion
              key={ptData.CORRECT + (ptData.ANS1 ?? '') + (ptData.ANS3 ?? '')}
              data={ptData}
              onClose={() => setShowPt(false)}
            />
          ) : null}
        </View>
      </Modal>

      {/* Enhanced Matching Question Modal */}
      <Modal
        visible={showEm}
        animationType="slide"
        onRequestClose={() => setShowEm(false)}
        statusBarTranslucent
      >
        <View style={[styles.emModal, { paddingTop: insets.top }]}>
          <View style={styles.emModalHeader}>
            <Text style={styles.emModalTitle}>QTST001 — Enhanced Matching</Text>
            <Pressable
              onPress={() => setShowEm(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.emModalClose}
            >
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          {emData ? (
            <EnhancedMatchingQuestion key={emData.CORRECT + emData.ANS1 + (emData.ANS6 ?? '') + (emData.AIMG4 ?? '')} data={emData} onClose={() => setShowEm(false)} />
          ) : null}
        </View>
      </Modal>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <MaterialIcons name="storage" size={14} color={Colors.textMuted} />
          <Text style={styles.toolbarPath} numberOfLines={1}>{logPath}</Text>
        </View>
        <View style={styles.toolbarRight}>
          {lastRefreshed ? (
            <Text style={styles.toolbarRefreshed}>
              更新：{formatTime(lastRefreshed)}
            </Text>
          ) : null}
          <Pressable
            onPress={handleClearLog}
            disabled={clearing || isEmpty}
            style={({ pressed }) => [
              styles.clearBtn,
              (clearing || isEmpty) ? styles.clearBtnDisabled : null,
              pressed && !clearing && !isEmpty ? { opacity: 0.8 } : null,
            ]}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <MaterialIcons name="delete-outline" size={14} color={isEmpty ? Colors.textMuted : Colors.error} />
                <Text style={[styles.clearBtnText, isEmpty ? { color: Colors.textMuted } : null]}>清除日誌</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Stats bar */}
      {!loading && !isEmpty && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <MaterialIcons name="list" size={13} color={Colors.primary} />
            <Text style={styles.statText}>{entries.length} 條記錄</Text>
          </View>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.statText}>最新在前顯示</Text>
        </View>
      )}

      {/* Log Content */}
      {loading && !logContent ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerStateText}>載入日誌...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.centerState}>
          <MaterialIcons name="article" size={48} color={Colors.surfaceBorder} />
          <Text style={styles.centerStateText}>暫無日誌記錄</Text>
          <Text style={styles.centerStateHint}>API 呼叫後記錄將出現在這裡</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.logScroll}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: insets.bottom + Spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry, idx) => {
            // Parse header line: [YYYY-MM-DD HH:MM:SS] MODE url
            const lines = entry.split('\n');
            const headerLine = lines[0] ?? '';
            const bodyLines = lines.slice(1).join('\n').trim();

            // Extract timestamp, mode, url from header
            const timestampMatch = headerLine.match(/^\[([^\]]+)\]/);
            const rest = headerLine.replace(/^\[[^\]]+\]\s*/, '');
            const parts = rest.split(' ');
            const mode = parts[0] ?? '';
            const url = parts.slice(1).join(' ');

            const modeColor = getModeColor(mode);

            return (
              <View key={idx} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={[styles.modeBadge, { backgroundColor: `${modeColor}20`, borderColor: `${modeColor}50` }]}>
                    <Text style={[styles.modeBadgeText, { color: modeColor }]}>{mode || 'UNKNOWN'}</Text>
                  </View>
                  <Text style={styles.entryTimestamp} numberOfLines={1}>
                    {timestampMatch?.[1] ?? ''}
                  </Text>
                </View>
                {url ? (
                  <Text style={styles.entryUrl} numberOfLines={2}>{url}</Text>
                ) : null}
                {bodyLines ? (
                  <View style={styles.entryBodyWrap}>
                    <Text style={styles.entryBody}>{bodyLines}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function getModeColor(mode: string): string {
  const m = mode.toUpperCase();
  if (m === 'LOGIN') return Colors.primary;
  if (m === 'USERREG') return '#7B1FA2';
  if (m === 'FORGET') return Colors.warning;
  if (m === 'SAVEPR') return Colors.success;
  if (m === 'SAVEEX') return '#0277BD';
  if (m.startsWith('PRAC') || m === 'SAMP' || m === 'EXAM') return Colors.accent;
  return Colors.textSecondary;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  adminBadge: {
    backgroundColor: `${Colors.error}20`,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${Colors.error}40`,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
  },
  toolbarPath: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    flex: 1,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toolbarRefreshed: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  clearBtnDisabled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
  },
  clearBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.error,
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: `${Colors.primary}08`,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  statDivider: {
    color: Colors.surfaceBorder,
    fontSize: Typography.sm,
  },

  logScroll: { flex: 1 },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  centerStateText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  centerStateHint: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  entryCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  entryTimestamp: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    flex: 1,
  },
  entryUrl: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  entryBodyWrap: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  entryBody: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 18,
  },

  qtestBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  qtestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    ...Shadows.card,
  },
  qtestBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  qtestResultClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginLeft: 'auto',
  },
  qtestResultBox: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: '#0D1117',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: Spacing.sm,
  },
  qtestResultText: {
    fontSize: 11,
    color: '#58A6FF',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  openEmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1565C0',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  openEmBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  emModal: {
    flex: 1,
    backgroundColor: Colors.background,
    flexDirection: 'column',
  },
  emModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  emModalTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  emModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
});
