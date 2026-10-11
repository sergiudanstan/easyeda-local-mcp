const project = await eda.dmt_Project.getCurrentProjectInfo();
if (!project) throw new Error('No active project or API read failed.');
return project;
