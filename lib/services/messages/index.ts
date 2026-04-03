import {
  createJobConversation,
  generateJobAssignmentMessage,
  markAsRead,
  sendMessage,
  sendSystemMessage,
  toggleMessageReaction,
  updateMessage,
} from '@/lib/services/messages/mutations';
import {
  broadcastConversationCreated,
  broadcastNewMessage,
} from '@/lib/services/messages/publisher';
import {
  getConversation,
  getJobConversation,
  getUserConversations,
} from '@/lib/services/messages/queries';

export class MessageService {
  static createJobConversation = createJobConversation;

  static getJobConversation = getJobConversation;

  static generateJobAssignmentMessage = generateJobAssignmentMessage;

  static sendMessage = sendMessage;

  static sendSystemMessage = sendSystemMessage;

  static updateMessage = updateMessage;

  static toggleMessageReaction = toggleMessageReaction;

  static broadcastConversationCreated = broadcastConversationCreated;

  static broadcastNewMessage = broadcastNewMessage;

  static getConversation = getConversation;

  static markAsRead = markAsRead;

  static getUserConversations = getUserConversations;
}

export default MessageService;
