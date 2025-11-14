import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Heart,
  ThumbsUp,
  Lightbulb,
  Sparkles,
  MessageCircle,
  Send,
  Trash2,
  Edit2,
  Pin,
  User,
} from 'lucide-react';
import type { Post, Comment, Profile, PostReaction, CommentReaction } from '../../lib/types';

interface PostDetailViewProps {
  postId: string;
  groupId: string;
  onClose: () => void;
  onUpdate: () => void;
}

type PostWithAuthor = Post & { author: Profile };
type CommentWithAuthor = Comment & { author: Profile; replies?: CommentWithAuthor[] };

export function PostDetailView({ postId, groupId, onClose, onUpdate }: PostDetailViewProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [commentReactions, setCommentReactions] = useState<CommentReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadPostDetails();
    subscribeToComments();
  }, [postId]);

  const loadPostDetails = async () => {
    const [postRes, commentsRes, reactionsRes, commentReactionsRes] = await Promise.all([
      supabase.from('posts').select('*, author:profiles(*)').eq('id', postId).maybeSingle(),
      supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('post_reactions').select('*').eq('post_id', postId),
      supabase
        .from('comment_reactions')
        .select('*')
        .in(
          'comment_id',
          (await supabase.from('comments').select('id').eq('post_id', postId)).data?.map((c) => c.id) || []
        ),
    ]);

    if (postRes.data) setPost(postRes.data as any);
    if (reactionsRes.data) setReactions(reactionsRes.data);
    if (commentReactionsRes.data) setCommentReactions(commentReactionsRes.data);

    if (commentsRes.data) {
      const commentsMap = new Map<string, CommentWithAuthor>();
      commentsRes.data.forEach((c: any) => {
        commentsMap.set(c.id, { ...c, replies: [] });
      });

      const rootComments: CommentWithAuthor[] = [];
      commentsRes.data.forEach((c: any) => {
        if (c.parent_comment_id) {
          const parent = commentsMap.get(c.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentsMap.get(c.id)!);
          }
        } else {
          rootComments.push(commentsMap.get(c.id)!);
        }
      });

      setComments(rootComments);
    }

    setLoading(false);
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadPostDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReaction = async (reactionType: 'like' | 'helpful' | 'insightful' | 'love') => {
    if (!user) return;

    const existing = reactions.find((r) => r.user_id === user.id && r.reaction_type === reactionType);

    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id);
      setReactions(reactions.filter((r) => r.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        })
        .select()
        .single();
      if (data) setReactions([...reactions, data]);
    }
  };

  const handleCommentReaction = async (commentId: string, reactionType: 'like' | 'helpful') => {
    if (!user) return;

    const existing = commentReactions.find(
      (r) => r.comment_id === commentId && r.user_id === user.id && r.reaction_type === reactionType
    );

    if (existing) {
      await supabase.from('comment_reactions').delete().eq('id', existing.id);
      setCommentReactions(commentReactions.filter((r) => r.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        })
        .select()
        .single();
      if (data) setCommentReactions([...commentReactions, data]);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      content: commentText.trim(),
      parent_comment_id: replyingTo,
    });

    if (!error) {
      setCommentText('');
      setReplyingTo(null);
    }
    setSending(false);
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post?')) return;

    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      onUpdate();
      onClose();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      loadPostDetails();
    }
  };

  const renderComment = (comment: CommentWithAuthor, depth = 0) => {
    const commentLikes = commentReactions.filter(
      (r) => r.comment_id === comment.id && r.reaction_type === 'like'
    ).length;
    const commentHelpful = commentReactions.filter(
      (r) => r.comment_id === comment.id && r.reaction_type === 'helpful'
    ).length;
    const userLiked = commentReactions.some(
      (r) => r.comment_id === comment.id && r.user_id === user?.id && r.reaction_type === 'like'
    );
    const userHelpful = commentReactions.some(
      (r) => r.comment_id === comment.id && r.user_id === user?.id && r.reaction_type === 'helpful'
    );

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {comment.author.full_name || comment.author.email}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
                {comment.edited_at && <span className="text-xs text-gray-500 dark:text-gray-400">edited</span>}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => handleCommentReaction(comment.id, 'like')}
                  className={`flex items-center gap-1 text-xs ${
                    userLiked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  } hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
                >
                  <Heart className={`w-3 h-3 ${userLiked ? 'fill-current' : ''}`} />
                  {commentLikes > 0 && <span>{commentLikes}</span>}
                </button>
                <button
                  onClick={() => handleCommentReaction(comment.id, 'helpful')}
                  className={`flex items-center gap-1 text-xs ${
                    userHelpful ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  } hover:text-green-600 dark:hover:text-green-400 transition-colors`}
                >
                  <ThumbsUp className={`w-3 h-3 ${userHelpful ? 'fill-current' : ''}`} />
                  {commentHelpful > 0 && <span>{commentHelpful}</span>}
                </button>
                {depth < 3 && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Reply
                  </button>
                )}
                {comment.author_id === user?.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">{comment.replies.map((reply) => renderComment(reply, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading || !post) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const reactionCounts = {
    like: reactions.filter((r) => r.reaction_type === 'like').length,
    helpful: reactions.filter((r) => r.reaction_type === 'helpful').length,
    insightful: reactions.filter((r) => r.reaction_type === 'insightful').length,
    love: reactions.filter((r) => r.reaction_type === 'love').length,
  };

  const userReactions = reactions.filter((r) => r.user_id === user?.id).map((r) => r.reaction_type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full my-8 transition-colors">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {post.is_pinned && <Pin className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{post.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {post.author.full_name || post.author.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(post.created_at).toLocaleString()}
                  {post.edited_at && ' • edited'}
                </p>
              </div>
              {post.author_id === user?.id && (
                <button
                  onClick={handleDeletePost}
                  className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  userReactions.includes('like')
                    ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Heart className={`w-4 h-4 ${userReactions.includes('like') ? 'fill-current' : ''}`} />
                {reactionCounts.like > 0 && <span className="text-sm">{reactionCounts.like}</span>}
              </button>
              <button
                onClick={() => handleReaction('helpful')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  userReactions.includes('helpful')
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${userReactions.includes('helpful') ? 'fill-current' : ''}`} />
                {reactionCounts.helpful > 0 && <span className="text-sm">{reactionCounts.helpful}</span>}
              </button>
              <button
                onClick={() => handleReaction('insightful')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  userReactions.includes('insightful')
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Lightbulb className={`w-4 h-4 ${userReactions.includes('insightful') ? 'fill-current' : ''}`} />
                {reactionCounts.insightful > 0 && <span className="text-sm">{reactionCounts.insightful}</span>}
              </button>
              <button
                onClick={() => handleReaction('love')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  userReactions.includes('love')
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${userReactions.includes('love') ? 'fill-current' : ''}`} />
                {reactionCounts.love > 0 && <span className="text-sm">{reactionCounts.love}</span>}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments ({comments.length})
            </h3>

            <form onSubmit={handleSubmitComment} className="mb-6">
              {replyingTo && (
                <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Replying to comment...{' '}
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <button
                  type="submit"
                  disabled={sending || !commentText.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => renderComment(comment))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
