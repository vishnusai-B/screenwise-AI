import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ChatMessage } from '../types';

export default function AskAiScreen() {
  const router = useRouter();
  const { chatMessages, addChatMessage, currentAnalysis, clearChat } = useApp();
  const [inputText, setInputText] = useState('');

  const quickQuestions = [
    'What does this error code mean?',
    'What button should I click first?',
    'Is it safe to submit my information?',
    'What happens if I ignore this screen?',
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    // Add user message
    addChatMessage({
      role: 'user',
      content: query.trim(),
    });

    setInputText('');

    // Simulated responsive AI follow-up (Phase 8 full Gemini API will connect here)
    setTimeout(() => {
      addChatMessage({
        role: 'assistant',
        content: `Based on your screenshot "${currentAnalysis?.screenTitle || 'current screen'}": ${
          query.toLowerCase().includes('error')
            ? 'The error occurs because the session token became invalid or expired. To fix it, tap on the OK button, refresh the official login URL, and re-authenticate.'
            : 'You should follow the recommended step: ensure all mandatory fields marked with an asterisk are filled out before proceeding with submission.'
        }`,
      });
    }, 500);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color={colors.textInverse} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Header
        title="Ask AI Assistant"
        subtitle={currentAnalysis ? currentAnalysis.screenTitle : 'Follow-up questions'}
        showBack={true}
        rightAction={
          <TouchableOpacity onPress={clearChat} style={styles.clearBtn}>
            <Ionicons name="refresh-outline" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        }
      />

      {/* Screen Context Banner */}
      <View style={styles.contextBanner}>
        <Ionicons name="scan-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.contextText} numberOfLines={1}>
          Context: {currentAnalysis ? currentAnalysis.screenTitle : 'Active Screenshot'}
        </Text>
      </View>

      {/* Message List */}
      <FlatList
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Prompts */}
      <View style={styles.quickPromptsContainer}>
        <Text style={styles.quickPromptLabel}>Suggested Questions:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickQuestions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => handleSend(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPillText}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        />
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          placeholder="Ask a question about this screen..."
          placeholderTextColor={colors.mutedText}
          value={inputText}
          onChangeText={setInputText}
          style={styles.textInput}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 82, 186, 0.1)',
  },
  contextText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
    ...shadows.subtle,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: colors.textInverse,
  },
  bubbleTextAssistant: {
    color: colors.primaryText,
  },
  quickPromptsContainer: {
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickPromptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    paddingHorizontal: spacing.lg,
    marginBottom: 4,
  },
  quickPill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  quickPillText: {
    fontSize: 12,
    color: colors.primaryText,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
});

