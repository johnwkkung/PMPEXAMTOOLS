import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import { useFontSize } from '@/hooks/useFontSize';
import {
  fetchQuizQuestions,
  getCorrectIndex,
  QuizQuestion,
  QuizMode,
} from '@/services/quizManagerService';
import { ProgressBar } from '@/components/ui/ProgressBar';

// ─── Image resolver: maps filename → require() map for bundled assets ─────────
// Add entries here when new images are uploaded to assets/images/
const IMAGE_MAP: Record<string, any> = {
  'B_1_0.jpg': require('@/assets/images/B_1_0.jpg'),
  'B_2_0.jpg': require('@/assets/images/B_2_0.jpg'),
  'B_3_0.jpg': require('@/assets/images/B_3_0.jpg'),
  'B_4_0.jpg': require('@/assets/images/B_4_0.jpg'),
  'B_5_0.jpg': require('@/assets/images/B_5_0.jpg'),
  'B_6_0.jpg': require('@/assets/images/B_6_0.jpg'),
  'B_7_0.jpg': require('@/assets/images/B_7_0.jpg'),
  'B_8_0.jpg': require('@/assets/images/B_8_0.jpg'),
  'B_9_0.jpg': require('@/assets/images/B_9_0.jpg'),
  'B_10_0.jpg': require('@/assets/images/B_10_0.jpg'),
  'B_11_0.jpg': require('@/assets/images/B_11_0.jpg'),
  'B_12_0.jpg': require('@/assets/images/B_12_0.jpg'),
  'B_13_0.jpg': require('@/assets/images/B_13_0.jpg'),
  'B_14_0.jpg': require('@/assets/images/B_14_0.jpg'),
  'B_16_0.jpg': require('@/assets/images/B_16_0.jpg'),
  'B_16_1.jpg': require('@/assets/images/B_16_1.jpg'),
  'B_16_2.jpg': require('@/assets/images/B_16_2.jpg'),
  'B_16_3.jpg': require('@/assets/images/B_16_3.jpg'),
  'B_36_1.jpg': require('@/assets/images/B_36_1.jpg'),
  'B_36_2.jpg': require('@/assets/images/B_36_2.jpg'),
  'B_36_3.jpg': require('@/assets/images/B_36_3.jpg'),
  'B_37_0.jpg': require('@/assets/images/B_37_0.jpg'),
  'B_38_1.jpg': require('@/assets/images/B_38_1.jpg'),
  'B_38_2.jpg': require('@/assets/images/B_38_2.jpg'),
  'B_38_3.jpg': require('@/assets/images/B_38_3.jpg'),
  'B_39_0.jpg': require('@/assets/images/B_39_0.jpg'),
  'B_40_0.jpg': require('@/assets/images/B_40_0.jpg'),
  'B_41_1.jpg': require('@/assets/images/B_41_1.jpg'),
  'B_41_2.jpg': require('@/assets/images/B_41_2.jpg'),
  'B_41_3.jpg': require('@/assets/images/B_41_3.jpg'),
  'B_42_0.jpg': require('@/assets/images/B_42_0.jpg'),
  'B_43_0.jpg': require('@/assets/images/B_43_0.jpg'),
  'B_71_0.jpg': require('@/assets/images/B_71_0.jpg'),
  'B_72_0.jpg': require('@/assets/images/B_72_0.jpg'),
  'B_73_0.jpg': require('@/assets/images/B_73_0.jpg'),
  'B_74_0.jpg': require('@/assets/images/B_74_0.jpg'),
  'B_75_0.jpg': require('@/assets/images/B_75_0.jpg'),
  'B_76_0.jpg': require('@/assets/images/B_76_0.jpg'),
  'B_77_0.jpg': require('@/assets/images/B_77_0.jpg'),
  'B_78_0.jpg': require('@/assets/images/B_78_0.jpg'),
  'B_79_0.jpg': require('@/assets/images/B_79_0.jpg'),
  'B_80_0.jpg': require('@/assets/images/B_80_0.jpg'),
  'B_81_0.jpg': require('@/assets/images/B_81_0.jpg'),
  'B_82_0.jpg': require('@/assets/images/B_82_0.jpg'),
  'B_83_0.jpg': require('@/assets/images/B_83_0.jpg'),
  'B_84_0.jpg': require('@/assets/images/B_84_0.jpg'),
  'B_85_0.jpg': require('@/assets/images/B_85_0.jpg'),
  'B_86_0.jpg': require('@/assets/images/B_86_0.jpg'),
  'B_87_0.jpg': require('@/assets/images/B_87_0.jpg'),
  'B_88_0.jpg': require('@/assets/images/B_88_0.jpg'),
  'B_89_0.jpg': require('@/assets/images/B_89_0.jpg'),
  'B_106_0.jpg': require('@/assets/images/B_106_0.jpg'),
  'B_107_0.jpg': require('@/assets/images/B_107_0.jpg'),
  'B_108_0.jpg': require('@/assets/images/B_108_0.jpg'),
  'B_109_0.jpg': require('@/assets/images/B_109_0.jpg'),
  'B_110_0.jpg': require('@/assets/images/B_110_0.jpg'),
  'B_111_1.jpg': require('@/assets/images/B_111_1.jpg'),
  'B_111_2.jpg': require('@/assets/images/B_111_2.jpg'),
  'B_111_3.jpg': require('@/assets/images/B_111_3.jpg'),
  'B_112_0.jpg': require('@/assets/images/B_112_0.jpg'),
  'B_113_0.jpg': require('@/assets/images/B_113_0.jpg'),
  'B_114_0.jpg': require('@/assets/images/B_114_0.jpg'),
  'B_115_0.jpg': require('@/assets/images/B_115_0.jpg'),
  'B_116_0.jpg': require('@/assets/images/B_116_0.jpg'),
  'B_117_0.jpg': require('@/assets/images/B_117_0.jpg'),
  'B_118_0.jpg': require('@/assets/images/B_118_0.jpg'),
  'B_119_0.jpg': require('@/assets/images/B_119_0.jpg'),
  'B_120_0.jpg': require('@/assets/images/B_120_0.jpg'),
  'B_121_0.jpg': require('@/assets/images/B_121_0.jpg'),
  'B_122_0.jpg': require('@/assets/images/B_122_0.jpg'),
  'B_124_0.jpg': require('@/assets/images/B_124_0.jpg'),
  'B_141_0.jpg': require('@/assets/images/B_141_0.jpg'),
  'B_142_0.jpg': require('@/assets/images/B_142_0.jpg'),
  'B_143_0.jpg': require('@/assets/images/B_143_0.jpg'),
  'B_144_0.jpg': require('@/assets/images/B_144_0.jpg'),
  'B_145_0.jpg': require('@/assets/images/B_145_0.jpg'),
  'B_146_0.jpg': require('@/assets/images/B_146_0.jpg'),
  'B_147_0.jpg': require('@/assets/images/B_147_0.jpg'),
  'B_148_0.jpg': require('@/assets/images/B_148_0.jpg'),
  'B_149_0.jpg': require('@/assets/images/B_149_0.jpg'),
  'B_150_0.jpg': require('@/assets/images/B_150_0.jpg'),
  'B_151_0.jpg': require('@/assets/images/B_151_0.jpg'),
  'B_152_0.jpg': require('@/assets/images/B_152_0.jpg'),
  'B_153_0.jpg': require('@/assets/images/B_153_0.jpg'),
  'B_154_0.jpg': require('@/assets/images/B_154_0.jpg'),
  'B_155_0.jpg': require('@/assets/images/B_155_0.jpg'),
  'B_156_0.jpg': require('@/assets/images/B_156_0.jpg'),
  'B_157_0.jpg': require('@/assets/images/B_157_0.jpg'),
  'B_158_0.jpg': require('@/assets/images/B_158_0.jpg'),
  'B_159_0.jpg': require('@/assets/images/B_159_0.jpg'),
  'B_160_0.jpg': require('@/assets/images/B_160_0.jpg'),
  'B_161_0.jpg': require('@/assets/images/B_161_0.jpg'),
  'B_162_0.jpg': require('@/assets/images/B_162_0.jpg'),
  'B_163_0.jpg': require('@/assets/images/B_163_0.jpg'),
  'B_164_0.jpg': require('@/assets/images/B_164_0.jpg'),
  'B_165_0.jpg': require('@/assets/images/B_165_0.jpg'),
  'B_166_0.jpg': require('@/assets/images/B_166_0.jpg'),
  'B_167_0.jpg': require('@/assets/images/B_167_0.jpg'),
  'B_168_0.jpg': require('@/assets/images/B_168_0.jpg'),
  'B_169_0.jpg': require('@/assets/images/B_169_0.jpg'),
  'B_170_0.jpg': require('@/assets/images/B_170_0.jpg'),
  'B_171_0.jpg': require('@/assets/images/B_171_0.jpg'),
  'B_172_0.jpg': require('@/assets/images/B_172_0.jpg'),
  'B_173_0.jpg': require('@/assets/images/B_173_0.jpg'),
  'B_174_0.jpg': require('@/assets/images/B_174_0.jpg'),
  'B_175_0.jpg': require('@/assets/images/B_175_0.jpg'),
  'B_176_0.jpg': require('@/assets/images/B_176_0.jpg'),
  'B_177_0.jpg': require('@/assets/images/B_177_0.jpg'),
  'B_178_0.jpg': require('@/assets/images/B_178_0.jpg'),
  'B_179_0.jpg': require('@/assets/images/B_179_0.jpg'),
  'B_180_0.jpg': require('@/assets/images/B_180_0.jpg'),
  'B_181_0.jpg': require('@/assets/images/B_181_0.jpg'),
  'B_182_0.jpg': require('@/assets/images/B_182_0.jpg'),
  'B_183_0.jpg': require('@/assets/images/B_183_0.jpg'),
  'B_184_0.jpg': require('@/assets/images/B_184_0.jpg'),
  'B_185_0.jpg': require('@/assets/images/B_185_0.jpg'),
  'B_186_0.jpg': require('@/assets/images/B_186_0.jpg'),
  'B_187_0.jpg': require('@/assets/images/B_187_0.jpg'),
  'B_188_0.jpg': require('@/assets/images/B_188_0.jpg'),
  'B_189_0.jpg': require('@/assets/images/B_189_0.jpg'),
  'B_190_0.jpg': require('@/assets/images/B_190_0.jpg'),
  'B_191_0.jpg': require('@/assets/images/B_191_0.jpg'),
  'B_192_0.jpg': require('@/assets/images/B_192_0.jpg'),
  'B_193_0.jpg': require('@/assets/images/B_193_0.jpg'),
  'B_194_0.jpg': require('@/assets/images/B_194_0.jpg'),
  'B_195_0.jpg': require('@/assets/images/B_195_0.jpg'),
  'B_196_0.jpg': require('@/assets/images/B_196_0.jpg'),
  'B_197_0.jpg': require('@/assets/images/B_197_0.jpg'),
  'B_198_0.jpg': require('@/assets/images/B_198_0.jpg'),
  'B_199_0.jpg': require('@/assets/images/B_199_0.jpg'),
  'B_200_0.jpg': require('@/assets/images/B_200_0.jpg'),
  'B_201_0.jpg': require('@/assets/images/B_201_0.jpg'),
  'B_202_0.jpg': require('@/assets/images/B_202_0.jpg'),
  'B_203_0.jpg': require('@/assets/images/B_203_0.jpg'),
  'B_204_0.jpg': require('@/assets/images/B_204_0.jpg'),
  'B_205_0.jpg': require('@/assets/images/B_205_0.jpg'),
  'B_206_0.jpg': require('@/assets/images/B_206_0.jpg'),
  'B_207_0.jpg': require('@/assets/images/B_207_0.jpg'),
  'B_208_0.jpg': require('@/assets/images/B_208_0.jpg'),
  'B_209_0.jpg': require('@/assets/images/B_209_0.jpg'),
  'B_210_0.jpg': require('@/assets/images/B_210_0.jpg'),
  'B_211_0.jpg': require('@/assets/images/B_211_0.jpg'),
  'B_212_0.jpg': require('@/assets/images/B_212_0.jpg'),
  'B_213_0.jpg': require('@/assets/images/B_213_0.jpg'),
  'B_214_0.jpg': require('@/assets/images/B_214_0.jpg'),
  'B_215_0.jpg': require('@/assets/images/B_215_0.jpg'),
  'B_216_0.jpg': require('@/assets/images/B_216_0.jpg'),
  'B_217_0.jpg': require('@/assets/images/B_217_0.jpg'),
  'B_218_0.jpg': require('@/assets/images/B_218_0.jpg'),
  'B_219_0.jpg': require('@/assets/images/B_219_0.jpg'),
  'B_220_0.jpg': require('@/assets/images/B_220_0.jpg'),
  'B_221_0.jpg': require('@/assets/images/B_221_0.jpg'),
  'B_223_0.jpg': require('@/assets/images/B_223_0.jpg'),
  'B_224_0.jpg': require('@/assets/images/B_224_0.jpg'),
  'B_225_0.jpg': require('@/assets/images/B_225_0.jpg'),
  'B_226_0.jpg': require('@/assets/images/B_226_0.jpg'),
  'B_227_0.jpg': require('@/assets/images/B_227_0.jpg'),
  'B_229_0.jpg': require('@/assets/images/B_229_0.jpg'),
  'B_230_0.jpg': require('@/assets/images/B_230_0.jpg'),
  'B_231_0.jpg': require('@/assets/images/B_231_0.jpg'),
  'B_232_0.jpg': require('@/assets/images/B_232_0.jpg'),
  'B_233_0.jpg': require('@/assets/images/B_233_0.jpg'),
  'B_234_0.jpg': require('@/assets/images/B_234_0.jpg'),
  'B_235_0.jpg': require('@/assets/images/B_235_0.jpg'),
  'B_237_0.jpg': require('@/assets/images/B_237_0.jpg'),
  'B_238_0.jpg': require('@/assets/images/B_238_0.jpg'),
  'B_239_0.jpg': require('@/assets/images/B_239_0.jpg'),
  'B_240_0.jpg': require('@/assets/images/B_240_0.jpg'),
  'B_391_0.jpg': require('@/assets/images/B_391_0.jpg'),
  'B_392_0.jpg': require('@/assets/images/B_392_0.jpg'),
  'B_393_0.jpg': require('@/assets/images/B_393_0.jpg'),
  'B_394_0.jpg': require('@/assets/images/B_394_0.jpg'),
  'B_395_0.jpg': require('@/assets/images/B_395_0.jpg'),
  'B_396_0.jpg': require('@/assets/images/B_396_0.jpg'),
  'B_397_0.jpg': require('@/assets/images/B_397_0.jpg'),
  'B_398_0.jpg': require('@/assets/images/B_398_0.jpg'),
  'B_399_0.jpg': require('@/assets/images/B_399_0.jpg'),
  'B_400_0.jpg': require('@/assets/images/B_400_0.jpg'),
  'B_401_0.jpg': require('@/assets/images/B_401_0.jpg'),
  'B_402_1.jpg': require('@/assets/images/B_402_1.jpg'),
  'B_402_2.jpg': require('@/assets/images/B_402_2.jpg'),
  'B_403_0.jpg': require('@/assets/images/B_403_0.jpg'),
  'B_404_0.jpg': require('@/assets/images/B_404_0.jpg'),
  'B_405_0.jpg': require('@/assets/images/B_405_0.jpg'),
  'B_406_0.jpg': require('@/assets/images/B_406_0.jpg'),
  'B_407_0.jpg': require('@/assets/images/B_407_0.jpg'),
  'B_408_0.jpg': require('@/assets/images/B_408_0.jpg'),
  'B_409_0.jpg': require('@/assets/images/B_409_0.jpg'),
  'B_410_0.jpg': require('@/assets/images/B_410_0.jpg'),
  'B_538_0.jpg': require('@/assets/images/B_538_0.jpg'),
  'B_539_0.jpg': require('@/assets/images/B_539_0.jpg'),
  'B_540_0.jpg': require('@/assets/images/B_540_0.jpg'),
  'B_541_0.jpg': require('@/assets/images/B_541_0.jpg'),
  'B_542_0.jpg': require('@/assets/images/B_542_0.jpg'),
  'B_543_0.jpg': require('@/assets/images/B_543_0.jpg'),
  'B_544_0.jpg': require('@/assets/images/B_544_0.jpg'),
  'B_545_0.jpg': require('@/assets/images/B_545_0.jpg'),
  'B_546_0.jpg': require('@/assets/images/B_546_0.jpg'),
  'B_547_0.jpg': require('@/assets/images/B_547_0.jpg'),
  'B_548_0.jpg': require('@/assets/images/B_548_0.jpg'),
  'B_550_0.jpg': require('@/assets/images/B_550_0.jpg'),
  'B_551_0.jpg': require('@/assets/images/B_551_0.jpg'),
  'B_552_0.jpg': require('@/assets/images/B_552_0.jpg'),
  'B_553_0.jpg': require('@/assets/images/B_553_0.jpg'),
  'B_554_0.jpg': require('@/assets/images/B_554_0.jpg'),
  'B_555_0.jpg': require('@/assets/images/B_555_0.jpg'),
  'B_556_0.jpg': require('@/assets/images/B_556_0.jpg'),
  'B_557_0.jpg': require('@/assets/images/B_557_0.jpg'),
  'B_558_0.jpg': require('@/assets/images/B_558_0.jpg'),
  'B_559_0.jpg': require('@/assets/images/B_559_0.jpg'),
  'B_560_0.jpg': require('@/assets/images/B_560_0.jpg'),
  'B_636_1.jpg': require('@/assets/images/B_636_1.jpg'),
  'B_636_2.jpg': require('@/assets/images/B_636_2.jpg'),
  'B_636_3.jpg': require('@/assets/images/B_636_3.jpg'),
  'B_637_0.jpg': require('@/assets/images/B_637_0.jpg'),
  'B_638_0.jpg': require('@/assets/images/B_638_0.jpg'),
  'B_639_0.jpg': require('@/assets/images/B_639_0.jpg'),
  'B_640_0.jpg': require('@/assets/images/B_640_0.jpg'),
  'B_641_0.jpg': require('@/assets/images/B_641_0.jpg'),
  'B_642_0.jpg': require('@/assets/images/B_642_0.jpg'),
  'B_643_0.jpg': require('@/assets/images/B_643_0.jpg'),
  'B_644_0.jpg': require('@/assets/images/B_644_0.jpg'),
  'B_645_0.jpg': require('@/assets/images/B_645_0.jpg'),
  'B_646_0.jpg': require('@/assets/images/B_646_0.jpg'),
  'B_647_0.jpg': require('@/assets/images/B_647_0.jpg'),
  'B_648_0.jpg': require('@/assets/images/B_648_0.jpg'),
  'B_649_0.jpg': require('@/assets/images/B_649_0.jpg'),
  'B_650_0.jpg': require('@/assets/images/B_650_0.jpg'),
  'B_651_0.jpg': require('@/assets/images/B_651_0.jpg'),
  'B_652_0.jpg': require('@/assets/images/B_652_0.jpg'),
  'B_653_0.jpg': require('@/assets/images/B_653_0.jpg'),
  'B_654_0.jpg': require('@/assets/images/B_654_0.jpg'),
  'B_655_0.jpg': require('@/assets/images/B_655_0.jpg'),
  'B_656_0.jpg': require('@/assets/images/B_656_0.jpg'),
  'B_657_0.jpg': require('@/assets/images/B_657_0.jpg'),
  'B_658_0.jpg': require('@/assets/images/B_658_0.jpg'),
  'B_659_0.jpg': require('@/assets/images/B_659_0.jpg'),
  'B_660_0.jpg': require('@/assets/images/B_660_0.jpg'),
  'B_661_0.jpg': require('@/assets/images/B_661_0.jpg'),
  'B_662_0.jpg': require('@/assets/images/B_662_0.jpg'),
  'B_663_0.jpg': require('@/assets/images/B_663_0.jpg'),
  'B_664_0.jpg': require('@/assets/images/B_664_0.jpg'),
  'B_665_0.jpg': require('@/assets/images/B_665_0.jpg'),
  'B_666_0.jpg': require('@/assets/images/B_666_0.jpg'),
  'B_667_0.jpg': require('@/assets/images/B_667_0.jpg'),
  'B_668_0.jpg': require('@/assets/images/B_668_0.jpg'),
  'B_669_0.jpg': require('@/assets/images/B_669_0.jpg'),
  'B_670_0.jpg': require('@/assets/images/B_670_0.jpg'),
  'B_671_0.jpg': require('@/assets/images/B_671_0.jpg'),
  'B_672_0.jpg': require('@/assets/images/B_672_0.jpg'),
  'B_673_0.jpg': require('@/assets/images/B_673_0.jpg'),
  'B_674_0.jpg': require('@/assets/images/B_674_0.jpg'),
  'B_676_0.jpg': require('@/assets/images/B_676_0.jpg'),
  'B_677_1.jpg': require('@/assets/images/B_677_1.jpg'),
  'B_677_2.jpg': require('@/assets/images/B_677_2.jpg'),
  'B_677_3.jpg': require('@/assets/images/B_677_3.jpg'),
  'B_678_0.jpg': require('@/assets/images/B_678_0.jpg'),
  'B_679_0.jpg': require('@/assets/images/B_679_0.jpg'),
  'B_680_0.jpg': require('@/assets/images/B_680_0.jpg'),
  'B_681_0.jpg': require('@/assets/images/B_681_0.jpg'),
  'B_682_0.jpg': require('@/assets/images/B_682_0.jpg'),
  'B_683_0.jpg': require('@/assets/images/B_683_0.jpg'),
  'B_684_0.jpg': require('@/assets/images/B_684_0.jpg'),
  'B_685_0.jpg': require('@/assets/images/B_685_0.jpg'),
  'B_727_0.jpg': require('@/assets/images/B_727_0.jpg'),
  'B_732_0.jpg': require('@/assets/images/B_732_0.jpg'),
};

function resolveImage(filename: string | null): any | null {
  if (!filename) return null;
  // Strip any path prefix, use only the filename
  const name = filename.split('/').pop() ?? filename;
  return IMAGE_MAP[name] ?? null;
}

// ─── Timer hook ────────────────────────────────────────────────────────────
function useCountdown(totalSeconds: number | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds ?? 0);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (totalSeconds === null || totalSeconds <= 0) return;
    setRemaining(totalSeconds);
    expiredRef.current = false;

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds]);

  return remaining;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Answer options ─────────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Section boundary for EXAM mode ─────────────────────────────────────────
const EXAM_PART_A_COUNT = 30;
const EXAM_PART_A_TITLE = '甲部：的士及網約車營運';
const EXAM_PART_B_TITLE = '乙部：道路使用者守則';

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { showAlert } = useAlert();
  const { fs } = useFontSize();
  const scrollRef = useRef<ScrollView>(null);

  const mode = (params.quizMode as QuizMode) ?? 'SAMP';
  const title = (params.title as string) ?? '練習題目';
  const timeLimitMinutes = params.timeLimitMinutes ? parseInt(params.timeLimitMinutes as string, 10) : 0;
  const isExamMode = params.isExam === '1';
  const totalSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [startTime] = useState(Date.now());

  const handleTimeExpire = useCallback(() => {
    showAlert('時間到！', '考試時間已屆滿，系統將自動提交答案。', [
      { text: '確定', onPress: () => submitAnswers(true) },
    ]);
  }, []);

  const remainingSeconds = useCountdown(totalSeconds, handleTimeExpire);

  // Load questions on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await fetchQuizQuestions(mode);
      if (!result.success || result.questions.length === 0) {
        setError(result.message ?? '無法載入題目');
      } else {
        setQuestions(result.questions);
        setUserAnswers(new Array(result.questions.length).fill(null));
      }
      setLoading(false);
    })();
  }, [mode]);

  // Scroll to top when question changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentIndex]);

  const question = questions[currentIndex];
  const total = questions.length;

  const sectionTitle = isExamMode
    ? (currentIndex < EXAM_PART_A_COUNT ? EXAM_PART_A_TITLE : EXAM_PART_B_TITLE)
    : title;

  const isLastQuestion = currentIndex === total - 1;

  const handleSelectAnswer = (optionIndex: number) => {
    // In all modes: allow selecting/changing answer before navigating away
    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  };

  const submitAnswers = useCallback((timeExpired = false) => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    router.replace({
      pathname: '/results',
      params: {
        questions: JSON.stringify(questions),
        userAnswers: JSON.stringify(userAnswers),
        timeTakenSeconds: String(timeTaken),
        isExamMode: isExamMode ? '1' : '0',
        examPartACount: String(EXAM_PART_A_COUNT),
        quizMode: mode,
        isTimeout: timeExpired ? '1' : '0',
      },
    });
  }, [questions, userAnswers, startTime, isExamMode, mode]);

  const handleSubmit = () => {
    const unansweredIndices = questions.reduce<number[]>((indices, _, index) => {
      if (userAnswers[index] == null) indices.push(index);
      return indices;
    }, []);
    const unanswered = unansweredIndices.length;
    if (unanswered > 0) {
      showAlert(
        `尚有 ${unanswered} 題未作答`,
        isExamMode
          ? '確定提交嗎？未作答的題目將視為答錯。'
          : `未作答題號：${unansweredIndices.map((index) => index + 1).join('、')}\n\n確定提交嗎？未作答的題目將計入答錯。你也可以返回補答。`,
        [
          {
            text: isExamMode ? '繼續作答' : '返回補答',
            style: 'cancel',
            onPress: () => {
              if (!isExamMode) setCurrentIndex(unansweredIndices[0]);
            },
          },
          { text: '確定提交', style: 'destructive', onPress: () => submitAnswers(false) },
        ]
      );
    } else {
      showAlert('確認提交？', '提交後不可更改答案。', [
        { text: '取消', style: 'cancel' },
        { text: '提交', onPress: () => submitAnswers(false) },
      ]);
    }
  };

  const handleQuit = () => {
    showAlert('退出練習？', '你的作答進度將會遺失。', [
      { text: '繼續作答', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => router.replace('/home') },
    ]);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>正在載入題目...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <MaterialIcons name="error-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>無法載入題目</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <Pressable style={styles.errorRetryBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.errorRetryText}>返回主頁</Text>
        </Pressable>
      </View>
    );
  }

  if (!question) return null;

  const qimg = resolveImage(question.QIMG);
  const cimg1 = resolveImage(question.CIMG1);
  const cimg2 = resolveImage(question.CIMG2);
  const cimg3 = resolveImage(question.CIMG3);
  const hasChoiceImages = cimg1 || cimg2 || cimg3;
  const correctIdx = getCorrectIndex(question.CORRECT);
  const selectedAnswer = userAnswers[currentIndex];
  const answeredCount = userAnswers.filter((a) => a !== null).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={handleQuit} style={styles.quitBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.questionCounter}>
            {currentIndex + 1}
            <Text style={styles.questionCounterOf}> / {total}</Text>
          </Text>
          {isExamMode && (
            <Text style={styles.sectionLabel}>{sectionTitle}</Text>
          )}
        </View>

        {totalSeconds !== null ? (
          <View style={[
            styles.timerBadge,
            remainingSeconds < 300 ? styles.timerBadgeWarning : null,
          ]}>
            <MaterialIcons name="timer" size={14} color={remainingSeconds < 300 ? Colors.error : Colors.primary} />
            <Text style={[styles.timerText, remainingSeconds < 300 ? styles.timerTextWarning : null]}>
              {formatTime(remainingSeconds)}
            </Text>
          </View>
        ) : (
          <View style={styles.answeredBadge}>
            <MaterialIcons name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.answeredText}>{answeredCount}/{total}</Text>
          </View>
        )}
      </View>

      {/* ── Progress ── */}
      <View style={styles.progressWrapper}>
        <ProgressBar current={currentIndex + 1} total={total} />
      </View>

      {/* ── Question Content ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.questionScroll}
        contentContainerStyle={styles.questionScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question category label */}
        {!isExamMode && (
          <Text style={styles.modeLabel}>{title}</Text>
        )}

        {/* Question text */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNum}>第 {currentIndex + 1} 題</Text>
          <Text style={[styles.questionText, { fontSize: fs(Typography.lg), lineHeight: fs(Typography.lg) * 1.6 }]}>{question.QUESTION.trim()}</Text>

          {/* QIMG — single question image */}
          {qimg !== null && (
            <View style={styles.qimgWrap}>
              <Image
                source={qimg}
                style={styles.qimg}
                contentFit="contain"
                transition={200}
              />
            </View>
          )}

          {/* CIMG1/2/3 — choice images (3 columns) */}
          {hasChoiceImages && (
            <View style={styles.cimgRow}>
              {[cimg1, cimg2, cimg3].map((src, i) =>
                src !== null ? (
                  <View key={i} style={styles.cimgCell}>
                    <Image source={src} style={styles.cimg} contentFit="contain" transition={200} />
                    <Text style={styles.cimgLabel}>{OPTION_LABELS[i]}</Text>
                  </View>
                ) : (
                  <View key={i} style={styles.cimgCellEmpty} />
                )
              )}
            </View>
          )}
        </View>

        {/* ── Answer Options ── */}
        <View style={styles.optionsList}>
          {[question.ANS1, question.ANS2, question.ANS3, question.ANS4].map((ans, idx) => {
            if (!ans || ans.trim() === '') return null;
            const isSelected = selectedAnswer === idx;
            return (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.optionRow,
                  isSelected ? styles.optionRowSelected : null,
                  pressed ? { opacity: 0.8 } : null,
                ]}
                onPress={() => handleSelectAnswer(idx)}
              >
                <View style={[styles.optionBullet, isSelected ? styles.optionBulletSelected : null]}>
                  <Text style={[styles.optionBulletText, isSelected ? styles.optionBulletTextSelected : null]}>
                    {OPTION_LABELS[idx]}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null, { fontSize: fs(Typography.base), lineHeight: fs(Typography.base) * 1.4 }]}>
                  {ans.trim()}
                </Text>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={18} color={Colors.primary} style={styles.optionCheckIcon} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: Spacing.lg }} />
      </ScrollView>

      {/* ── Bottom Bar: BACK / NEXT / SUBMIT ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            styles.backBtn,
            currentIndex === 0 ? styles.navBtnDisabled : null,
            pressed && currentIndex > 0 ? { opacity: 0.75 } : null,
          ]}
          onPress={handleBack}
          disabled={currentIndex === 0}
        >
          <MaterialIcons name="arrow-back" size={18} color={currentIndex === 0 ? Colors.textMuted : Colors.textSecondary} />
          <Text style={[styles.navBtnText, currentIndex === 0 ? styles.navBtnTextDisabled : null]}>上一題</Text>
        </Pressable>

        {!isLastQuestion ? (
          <Pressable
            style={({ pressed }) => [
              styles.navBtn,
              styles.nextBtn,
              pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>下一題</Text>
            <MaterialIcons name="arrow-forward" size={18} color={Colors.textOnPrimary} />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.navBtn,
              styles.submitBtn,
              pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
            ]}
            onPress={handleSubmit}
          >
            <MaterialIcons name="flag" size={18} color={Colors.textOnPrimary} />
            <Text style={styles.submitBtnText}>提交答案</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },

  loadingText: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.sm },
  errorTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.error },
  errorDesc: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.lg },
  errorRetryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  errorRetryText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textOnPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  headerCenter: { alignItems: 'center', flex: 1, gap: 2 },
  questionCounter: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  questionCounterOf: {
    fontSize: Typography.lg,
    fontWeight: Typography.regular,
    color: Colors.textMuted,
  },
  sectionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  timerBadgeWarning: {
    backgroundColor: `${Colors.error}15`,
    borderColor: `${Colors.error}30`,
  },
  timerText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timerTextWarning: { color: Colors.error },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  answeredText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.success,
  },

  progressWrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },

  questionScroll: { flex: 1 },
  questionScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  modeLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.accent,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },

  questionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  questionNum: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    lineHeight: 28,
  },

  qimgWrap: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    overflow: 'hidden',
  },
  qimg: {
    width: '100%',
    height: 200,
  },

  cimgRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cimgCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  cimgCellEmpty: { flex: 1 },
  cimg: {
    width: '100%',
    height: 90,
  },
  cimgLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
  },

  optionsList: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  optionRowSelected: {
    backgroundColor: `${Colors.primary}12`,
    borderColor: Colors.primary,
  },
  optionBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionBulletSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionBulletText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    includeFontPadding: false,
  },
  optionBulletTextSelected: { color: Colors.textOnPrimary },
  optionText: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  optionCheckIcon: { flexShrink: 0 },

  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  navBtnTextDisabled: { color: Colors.textMuted },
  backBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    ...Shadows.elevated,
  },
  nextBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    ...Shadows.elevated,
  },
  submitBtnText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
