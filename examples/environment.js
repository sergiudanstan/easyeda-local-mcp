return {
  isClient: eda.sys_Environment.isClient(),
  version: eda.sys_Environment.getEditorCurrentVersion(),
  halfOffline: eda.sys_Environment.isHalfOfflineMode(),
};
