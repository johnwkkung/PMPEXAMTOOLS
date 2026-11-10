import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { useRouter } from 'expo-router';
import { useFontSize } from '@/hooks/useFontSize';
import { AppVersionFooter } from '@/components/ui/AppVersionFooter';
import { TermsOfServiceModal } from '@/components/ui/TermsOfServiceModal';
import { PrivacyPolicyModal } from '@/components/ui/PrivacyPolicyModal';
import { callUserManager, callForgotPassword } from '@/services/userManagerService';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

type AuthMode = 'login' | 'register' | 'forgot';
type OtpStep = 'form' | 'verify';

interface InputFieldProps {
  icon: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  rightAction?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function InputField({
  icon, label, placeholder, value, onChangeText,
  secureTextEntry, keyboardType = 'default', rightAction,
  autoCapitalize = 'none',
}: InputFieldProps) {
  const { fs } = useFontSize();
  return (
    <View style={fieldStyles.group}>
      <Text style={[fieldStyles.label, { fontSize: fs(Typography.sm) }]}>{label}</Text>
      <View style={fieldStyles.row}>
        <MaterialIcons name={icon as any} size={20} color={Colors.textMuted} style={fieldStyles.icon} />
        <TextInput
          style={[fieldStyles.input, { fontSize: fs(Typography.base) }]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType="next"
        />
        {rightAction}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { gap: 6 },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    height: 54,
    gap: Spacing.sm,
  },
  icon: { width: 20, flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    height: '100%',
    includeFontPadding: false,
  },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPassword, sendOTP, verifyOTPAndLogin, logout, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { fs } = useFontSize();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [otpStep, setOtpStep] = useState<OtpStep>('form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const openTerms = useCallback(() => {
    Keyboard.dismiss();
    setShowTerms(true);
  }, []);
  const closeTerms = useCallback(() => setShowTerms(false), []);
  const closePrivacy = useCallback(() => setShowPrivacy(false), []);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<OtpStep>('form');
  const [forgotOtpSending, setForgotOtpSending] = useState(false);
  const [forgotResetting, setForgotResetting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  const resetRegisterForm = () => {
    setOtpStep('form');
    setOtp('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const resetForgotForm = () => {
    setForgotStep('form');
    setForgotEmail('');
    setForgotOtp('');
    setForgotPassword('');
    setForgotConfirmPassword('');
    setShowForgotPassword(false);
    setShowForgotConfirm(false);
  };

  const handleSendOtp = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      showAlert('請填寫所有欄位', '請先填寫用戶名稱、電郵、密碼及確認密碼。');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('密碼不一致', '兩次輸入的密碼不相符，請重新確認。');
      return;
    }
    if (password.length < 6) {
      showAlert('密碼太短', '密碼必須至少6個字元。');
      return;
    }
    setOtpSending(true);
    const { error } = await sendOTP(email.trim().toLowerCase());
    setOtpSending(false);
    if (error) {
      showAlert('發送失敗', error);
      return;
    }
    setOtpStep('verify');
    showAlert('驗證碼已發送', `驗證碼已發送至 ${email.trim()}，請查收電郵並輸入4位數字驗證碼。`);
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim()) {
      showAlert('請輸入電郵地址', '請輸入您的註冊電郵地址。');
      return;
    }
    setForgotOtpSending(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: forgotEmail.trim().toLowerCase(),
    });
    setForgotOtpSending(false);
    if (error) {
      showAlert('發送失敗', error.message);
      return;
    }
    setForgotStep('verify');
    showAlert('驗證碼已發送', `驗證碼已發送至 ${forgotEmail.trim()}，請查收電郵並輸入4位數字驗證碼。`);
  };

  const handleResetPassword = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length < 4) {
      showAlert('請輸入驗證碼', '請輸入電郵收到的4位數字驗證碼。');
      return;
    }
    if (!forgotPassword || forgotPassword.length < 6) {
      showAlert('密碼太短', '新密碼必須至少6個字元。');
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      showAlert('密碼不一致', '兩次輸入的新密碼不相符，請重新確認。');
      return;
    }
    setForgotResetting(true);

    const supabase = getSupabaseClient();

    const { error: otpError, data: otpData } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim().toLowerCase(),
      token: forgotOtp.trim(),
      type: 'email',
    });
    if (otpError || !otpData?.user) {
      setForgotResetting(false);
      showAlert('驗證失敗', otpError?.message ?? '驗證碼不正確或已過期，請重試。');
      return;
    }

    const apiResult = await callForgotPassword({
      useremail: forgotEmail.trim().toLowerCase(),
      newpassword: forgotPassword,
    });
    if (!apiResult.success) {
      setForgotResetting(false);
      await supabase.auth.signOut();
      showAlert('密碼重設失敗', apiResult.message ?? '系統驗證失敗，請聯絡管理員。');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: forgotPassword });
    if (updateError) {
      setForgotResetting(false);
      await supabase.auth.signOut();
      showAlert('密碼更新失敗', updateError.message ?? '無法更新密碼，請稍後再試。');
      return;
    }
    setForgotResetting(false);

    await supabase.auth.signOut();
    const savedEmail = forgotEmail.trim().toLowerCase();
    showAlert('密碼已重設', '您的密碼已成功更新，請使用新密碼登入。', [
      {
        text: '立即登入',
        style: 'default',
        onPress: () => {
          resetForgotForm();
          setMode('login');
          setEmail(savedEmail);
        },
      },
    ]);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('請填寫所有欄位', '請輸入電郵及密碼。');
      return;
    }
    if (isLoggingIn) return;

    const trimmedEmail = email.trim().toLowerCase();
    setIsLoggingIn(true);

    try {
      const apiResult = await callUserManager({
        mode: 'LOGIN',
        useremail: trimmedEmail,
        password,
      });

      if (!apiResult.success) {
        showAlert('登入失敗', apiResult.message ?? '用戶管理系統驗證失敗，請聯絡管理員。');
        return;
      }

      if (apiResult.expired === 1) {
        showAlert('帳戶已過期', '您的帳戶使用期限已屆滿，請聯絡管理員續期。');
        return;
      }

      const supabase = getSupabaseClient();

      let { error, user } = await signInWithPassword(trimmedEmail, password);

      if (error && (error.includes('Invalid login credentials') || error.includes('invalid_credentials'))) {
        const { error: supaSignUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (supaSignUpError?.message.includes('already registered')) {
          console.log('[login] password mismatch, syncing via reset-password...');
          const { error: resetErr } = await supabase.functions.invoke('reset-password', {
            body: { email: trimmedEmail, new_password: password },
          });
          if (resetErr) {
            let resetMsg = '密碼同步失敗，請嘗試使用「忘記密碼」重設後再登入。';
            try {
              const { FunctionsHttpError } = await import('@supabase/supabase-js');
              if (resetErr instanceof FunctionsHttpError) {
                const raw = await resetErr.context?.text();
                if (raw) {
                  try { resetMsg = (JSON.parse(raw) as Record<string, unknown>)['error'] as string || raw; } catch { resetMsg = raw; }
                }
              }
            } catch { /* ignore */ }
            console.warn('[login] reset-password error:', resetMsg);
            showAlert('登入失敗', resetMsg);
            return;
          }
        } else if (supaSignUpError) {
          showAlert('登入失敗', supaSignUpError.message ?? '帳戶建立失敗，請聯絡管理員。');
          return;
        }

        const signInResult = await signInWithPassword(trimmedEmail, password);
        error = signInResult.error;
        user = signInResult.user;
      }

      if (error) {
        showAlert('登入失敗', error);
        return;
      }

      if (user) {
        const isVip = apiResult.userlevel?.toUpperCase() === 'VIP';
        const usernameFromApi = apiResult.username?.trim() || undefined;
        supabase
          .from('user_profiles')
          .upsert(
            { id: user.id, email: trimmedEmail, is_vip: isVip, ...(usernameFromApi ? { username: usernameFromApi } : {}) },
            { onConflict: 'id' }
          )
          .then(({ error: upsertErr }) => {
            if (upsertErr) console.warn('[login] profile upsert error:', upsertErr.message);
          });
        router.replace('/home');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      showAlert('請輸入驗證碼', '請輸入電郵收到的4位數字驗證碼。');
      return;
    }
    const { error, user } = await verifyOTPAndLogin(
      email.trim().toLowerCase(),
      otp.trim(),
      { password }
    );
    if (error) {
      showAlert('驗證失敗', error);
      return;
    }
    if (user) {
      const supabase = getSupabaseClient();
      const savedEmail = email.trim().toLowerCase();
      const savedUsername = username.trim();
      const savedPassword = password;

      supabase
        .from('user_profiles')
        .upsert(
          { id: user.id, email: savedEmail, username: savedUsername },
          { onConflict: 'id' }
        )
        .then(({ error: upsertErr }) => {
          if (upsertErr) console.warn('[register] profile upsert error:', upsertErr.message);
        });

      callUserManager({
        mode: 'USERREG',
        username: savedUsername,
        useremail: savedEmail,
        password: savedPassword,
      }).then((apiResult) => {
        if (!apiResult.success) {
          logout().then(() => {
            showAlert('註冊未獲批准', apiResult.message ?? '用戶管理系統拒絕了此次註冊，請聯絡管理員。');
          });
        }
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/logo.png')}
            style={{ width: Dimensions.get('window').width - Spacing.lg * 2, height: 140 }}
            contentFit="fill"
            transition={200}
          />
          <Text
            style={[styles.subtitleLine1, { fontSize: fs(Typography.base) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            的士及網約車綜合筆試練習及考試專家
          </Text>
        </View>

        {/* Mode Toggle — hidden on forgot password screen */}
        {mode !== 'forgot' && (
          <View style={styles.modeToggle}>
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.modeBtn, mode === m ? styles.modeBtnActive : null]}
                onPress={() => { setMode(m as AuthMode); if (m === 'register') resetRegisterForm(); }}
              >
                <MaterialIcons
                  name={m === 'login' ? 'login' : 'person-add'}
                  size={16}
                  color={mode === m ? Colors.textOnPrimary : Colors.textMuted}
                />
                <Text style={[styles.modeBtnText, mode === m ? styles.modeBtnTextActive : null]}>
                  {m === 'login' ? '登入' : '新用戶註冊'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}



        {/* Forgot password header */}
        {mode === 'forgot' && (
          <View style={styles.forgotHeader}>
            <Pressable
              onPress={() => { resetForgotForm(); setMode('login'); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.backBtn}
            >
              <MaterialIcons name="arrow-back" size={20} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.forgotHeaderTitle}>忘記密碼</Text>
          </View>
        )}

        {/* Keep the form and footer together without an empty spacer. */}
        <View style={styles.formSection}>
        <View style={styles.formCard}>
          {/* LOGIN FORM */}
          {mode === 'login' && (
            <>
              <InputField
                icon="email"
                label="電郵地址"
                placeholder="請輸入電郵地址"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                rightAction={
                  email.length > 0 ? (
                    <Pressable
                      onPress={() => setEmail('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : undefined
                }
              />
              <InputField
                icon="lock"
                label="密碼"
                placeholder="請輸入密碼"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightAction={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                }
              />
            </>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <>
              <InputField
                icon="person"
                label="用戶名稱"
                placeholder="請輸入用戶名稱"
                value={username}
                onChangeText={setUsername}
              />
              <InputField
                icon="email"
                label="電郵地址"
                placeholder="請輸入電郵地址"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                rightAction={
                  email.length > 0 ? (
                    <Pressable
                      onPress={() => setEmail('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : undefined
                }
              />
              <InputField
                icon="lock"
                label="密碼"
                placeholder="請設定密碼（最少6個字元）"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightAction={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                }
              />
              <InputField
                icon="lock-outline"
                label="確認密碼"
                placeholder="請再次輸入密碼"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                rightAction={
                  <Pressable
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons
                      name={showConfirm ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                }
              />

              {/* Send OTP Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.sendOtpBtn,
                  pressed && !otpSending ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  otpSending ? styles.submitBtnLoading : null,
                ]}
                onPress={handleSendOtp}
                disabled={otpSending}
              >
                {otpSending ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color={Colors.textOnPrimary} />
                    <Text style={styles.submitBtnText}>發送電郵驗證碼</Text>
                  </>
                )}
              </Pressable>

              {/* OTP sent status */}
              {otpStep === 'verify' && (
                <View style={styles.otpSentBanner}>
                  <MaterialIcons name="mark-email-read" size={20} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpSentTitle}>驗證碼已發送</Text>
                    <Text style={styles.otpSentDesc} numberOfLines={2}>
                      已發送至 {email.trim()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Verification Code Input */}
              <InputField
                icon="pin"
                label="電郵驗證碼"
                placeholder="請輸入4位數字驗證碼"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="phone-pad"
              />

              {/* Register Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && !operationLoading ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  operationLoading ? styles.submitBtnLoading : null,
                ]}
                onPress={handleRegister}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="verified-user" size={20} color={Colors.textOnPrimary} />
                    <Text style={styles.submitBtnText}>完成註冊</Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          {/* LOGIN SUBMIT BUTTON */}
          {mode === 'login' && (
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && !operationLoading && !isLoggingIn ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                (operationLoading || isLoggingIn) ? styles.submitBtnLoading : null,
              ]}
              onPress={handleLogin}
              disabled={operationLoading || isLoggingIn}
            >
              {(operationLoading || isLoggingIn) ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.submitBtnText}>登入</Text>
                </>
              )}
            </Pressable>
          )}

          {/* LOGIN: notice + switch link + forgot (bottom) */}
          {mode === 'login' && (
            <>
              {/* Account Level Notice — below 登入 button */}
              <View style={styles.vipNotice}>
                <MaterialIcons name="info-outline" size={16} color={Colors.primary} />
                <Text style={styles.vipNoticeText}>
                  免費用戶每類別提供10題示範練習。VIP 用戶可享有完整題庫及模擬考試功能。
                </Text>
              </View>

              <Pressable onPress={() => { setMode('register'); resetRegisterForm(); }} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>
                  沒有帳戶？{' '}
                  <Text style={{ color: Colors.primary, fontWeight: Typography.bold }}>立即註冊</Text>
                </Text>
              </Pressable>

              {/* Forgot password remains in the form; privacy shares the version footer. */}
              <View style={styles.bottomLinkRow}>
                <Pressable
                  onPress={() => { resetForgotForm(); setMode('forgot'); }}
                  style={styles.forgotLink}
                >
                  <MaterialIcons name="lock-reset" size={14} color={Colors.primary} />
                  <Text style={styles.forgotLinkText}>忘記密碼？</Text>
                </Pressable>
              </View>
            </>
          )}

          {mode === 'register' && (
            <Pressable onPress={() => setMode('login')} style={styles.switchLink}>
              <Text style={styles.switchLinkText}>
                已有帳戶？{' '}
                <Text style={{ color: Colors.primary, fontWeight: Typography.bold }}>立即登入</Text>
              </Text>
            </Pressable>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <>
              <View style={styles.forgotInfoBanner}>
                <MaterialIcons name="info-outline" size={18} color={Colors.accent} />
                <Text style={styles.forgotInfoText}>
                  請輸入您的註冊電郵地址，系統將發送驗證碼以重設密碼。
                </Text>
              </View>

              <InputField
                icon="email"
                label="註冊電郵地址"
                placeholder="請輸入註冊電郵地址"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                rightAction={
                  forgotEmail.length > 0 ? (
                    <Pressable
                      onPress={() => setForgotEmail('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MaterialIcons name="cancel" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : undefined
                }
              />

              {/* Send OTP Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.sendOtpBtn,
                  pressed && !forgotOtpSending ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                  forgotOtpSending ? styles.submitBtnLoading : null,
                ]}
                onPress={handleSendForgotOtp}
                disabled={forgotOtpSending}
              >
                {forgotOtpSending ? (
                  <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color={Colors.textOnPrimary} />
                    <Text style={styles.submitBtnText}>發送驗證碼</Text>
                  </>
                )}
              </Pressable>

              {/* OTP sent banner */}
              {forgotStep === 'verify' && (
                <View style={styles.otpSentBanner}>
                  <MaterialIcons name="mark-email-read" size={20} color={Colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.otpSentTitle}>驗證碼已發送</Text>
                    <Text style={styles.otpSentDesc} numberOfLines={2}>
                      已發送至 {forgotEmail.trim()}
                    </Text>
                  </View>
                </View>
              )}

              {/* OTP + new password (shown after OTP sent) */}
              {forgotStep === 'verify' && (
                <>
                  <InputField
                    icon="pin"
                    label="電郵驗證碼"
                    placeholder="請輸入4位數字驗證碼"
                    value={forgotOtp}
                    onChangeText={(t) => setForgotOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    keyboardType="phone-pad"
                  />
                  <InputField
                    icon="lock"
                    label="新密碼"
                    placeholder="請設定新密碼（最少6個字元）"
                    value={forgotPassword}
                    onChangeText={setForgotPassword}
                    secureTextEntry={!showForgotPassword}
                    rightAction={
                      <Pressable
                        onPress={() => setShowForgotPassword(!showForgotPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showForgotPassword ? 'visibility-off' : 'visibility'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </Pressable>
                    }
                  />
                  <InputField
                    icon="lock-outline"
                    label="確認新密碼"
                    placeholder="請再次輸入新密碼"
                    value={forgotConfirmPassword}
                    onChangeText={setForgotConfirmPassword}
                    secureTextEntry={!showForgotConfirm}
                    rightAction={
                      <Pressable
                        onPress={() => setShowForgotConfirm(!showForgotConfirm)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={showForgotConfirm ? 'visibility-off' : 'visibility'}
                          size={20}
                          color={Colors.textMuted}
                        />
                      </Pressable>
                    }
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.submitBtn,
                      pressed && !forgotResetting ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
                      forgotResetting ? styles.submitBtnLoading : null,
                    ]}
                    onPress={handleResetPassword}
                    disabled={forgotResetting}
                  >
                    {forgotResetting ? (
                      <ActivityIndicator color={Colors.textOnPrimary} />
                    ) : (
                      <>
                        <MaterialIcons name="lock-reset" size={20} color={Colors.textOnPrimary} />
                        <Text style={styles.submitBtnText}>確認重設密碼</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              <Pressable
                onPress={() => { resetForgotForm(); setMode('login'); }}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>
                  返回{' '}
                  <Text style={{ color: Colors.primary, fontWeight: Typography.bold }}>登入</Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <View style={styles.footerRow}>
          <AppVersionFooter inline style={styles.versionFooter} />
          <Pressable
            style={({ pressed }) => [styles.privacyLink, pressed ? { opacity: 0.6 } : null]}
            onPress={() => { Keyboard.dismiss(); setShowPrivacy(true); }}
            accessibilityRole="button"
            accessibilityLabel="私隱條款"
          >
            <MaterialIcons name="lock" size={13} color={Colors.textMuted} />
            <Text style={[styles.privacyLinkText, { fontSize: fs(Typography.xs) }]}>私隱條款</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, pressed ? { opacity: 0.6 } : null]}
            onPress={openTerms}
            accessibilityRole="button"
            accessibilityLabel="服務條款"
            accessibilityHint="開啟完整中文及英文服務條款"
          >
            <Text style={[styles.termsLinkText, { fontSize: fs(Typography.xs) }]}>{'📄 服務條款'}</Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>

      {showTerms ? <TermsOfServiceModal visible={showTerms} onClose={closeTerms} /> : null}

      <PrivacyPolicyModal visible={showPrivacy} onClose={closePrivacy} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  subtitleLine1: {
    width: '100%',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 26,
    textAlign: 'center',
    includeFontPadding: false,
  },
  logo: {
    width: 220,
    height: 140,
  },
  appSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadows.elevated,
  },
  modeBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: Colors.textOnPrimary,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  formSection: {
    gap: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  versionFooter: {
    flexBasis: Spacing.xxl + Spacing.lg,
    minWidth: Spacing.xxl + Spacing.lg,
  },
  termsLinkText: {
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    textDecorationLine: 'underline',
    includeFontPadding: false,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: Spacing.xs,
    minHeight: Spacing.xxl + Spacing.sm,
  },
  privacyLinkText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  formCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.card,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginTop: Spacing.xs,
    ...Shadows.elevated,
  },
  submitBtnLoading: {
    opacity: 0.7,
  },
  sendOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginTop: Spacing.xs,
    ...Shadows.elevated,
  },
  otpSentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${Colors.success}15`,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.success}35`,
  },
  otpSentTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.success,
  },
  otpSentDesc: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resendLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  resendLinkText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  forgotLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  forgotLinkText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  forgotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  forgotHeaderTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  forgotInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: `${Colors.accent}10`,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${Colors.accent}25`,
  },
  forgotInfoText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  submitBtnText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  switchLinkText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  vipNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: `${Colors.primary}15`,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  vipNoticeText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

});
