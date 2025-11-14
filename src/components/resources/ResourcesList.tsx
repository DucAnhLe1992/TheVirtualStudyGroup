import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Download, Trash2, Search, Filter } from 'lucide-react';
import { UploadResourceModal } from './UploadResourceModal';

interface Group {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  group_id: string;
  created_at: string;
  study_groups: {
    name: string;
  };
}

export function ResourcesList() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterResources();
  }, [resources, selectedGroupId, searchQuery]);

  const loadData = async () => {
    if (!user) return;

    const [groupsRes, resourcesRes] = await Promise.all([
      supabase
        .from('group_memberships')
        .select('study_groups(id, name)')
        .eq('user_id', user.id),
      supabase
        .from('resources')
        .select('*, study_groups(name)')
        .order('created_at', { ascending: false }),
    ]);

    if (groupsRes.data) {
      const groupsData = groupsRes.data.map((m: any) => m.study_groups).filter(Boolean);
      setGroups(groupsData);
    }

    if (resourcesRes.data) {
      const userGroupIds = groupsRes.data?.map((m: any) => m.study_groups?.id).filter(Boolean) || [];
      const filteredData = resourcesRes.data.filter((r: any) => userGroupIds.includes(r.group_id));
      setResources(filteredData);
    }

    setLoading(false);
  };

  const filterResources = () => {
    let filtered = resources;

    if (selectedGroupId !== 'all') {
      filtered = filtered.filter((r) => r.group_id === selectedGroupId);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.file_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  };

  const handleDeleteResource = async (resourceId: string, fileUrl: string) => {
    if (!confirm('Delete this resource?')) return;

    const filePath = fileUrl.split('/').pop();
    if (filePath) {
      await supabase.storage.from('resources').remove([filePath]);
    }

    await supabase.from('resources').delete().eq('id', resourceId);
    loadData();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Share and access study materials</p>
        </div>

        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No groups yet</h3>
          <p className="text-gray-600 dark:text-gray-400">Join a group to share resources</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Share and access study materials</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Upload Resource
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="all">All Groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {filteredResources.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No resources found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery || selectedGroupId !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload a resource to get started'}
          </p>
          {!searchQuery && selectedGroupId === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Upload Your First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const isOwner = resource.uploaded_by === user?.id;

            return (
              <div
                key={resource.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getFileIcon(resource.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {resource.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {resource.file_type.toUpperCase()} • {formatFileSize(resource.file_size)}
                      </p>
                    </div>
                  </div>
                </div>

                {resource.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {resource.description}
                  </p>
                )}

                <div className="mb-3">
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {resource.study_groups.name}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(resource.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {isOwner && (
                      <button
                        onClick={() => handleDeleteResource(resource.id, resource.file_url)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <UploadResourceModal
          groups={groups}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
