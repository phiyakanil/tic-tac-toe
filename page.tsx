/* eslint-disable camelcase */
import {toast as reactHotTost} from 'react-hot-toast';

import axios, {AxiosRequestConfig} from 'axios';

import {encodeBase64} from '@/shared/utils/encoding.util';

import {toast} from '../components/shadcn-components/ui/use-toast';
import {TOAST_MESSAGES_STATUS_MAP} from '../constants/constants';
import {AccessType} from '../interfaces/project-analysis';
import {returnBackendUrl} from './const.service';
import {IModuleConversionResponse, ITaskStats} from './types/code-conversion.types';
import {
	ApiRepoAnalyseResponse,
	IAssignCsToProjectPayload,
	IAssignCsToProjectResponse,
	ICreateProjectReportPayload,
	ICreateProjectReportResponse,
	IFeedbackData,
	IFetchFileDependenciesParameters,
	IFileDependenciesAPIResponse,
	IFileOfProject,
	IGetAllFilesOfProjectParameters,
	IGetFileDependenciesParameters,
	ISqlFileDependenciesAPIResponse,
	IUpdateFeatureHierarchyResponse,
	IUpdateFeaturesHierarchyParameters,
	ModuleBranchCreationPayload
} from './types/project-analysis.types';

const DEV_APPMOD_BASE_URL = import.meta.env?.['VITE_PROJECT_ANALYSER_BASE_URL'] as string;
const APPMOD_BASE_URL = import.meta.env?.['VITE_AI_BASE_URL'] as string;

const fetchRepoAnalyseData = async (taskId: string, userId: string, signal: AbortSignal, accessToken: string, access: AccessType): Promise<{data: ApiRepoAnalyseResponse; status: number}> => {
	const URL = `${DEV_APPMOD_BASE_URL}/analyzer/v2/get_project_summary_data`;

	const config: AxiosRequestConfig = {
		params: {task_id: taskId, user_id: userId, git_token: accessToken, public: access === 'view'},
		signal // Pass the AbortSignal to the request configuration
	};
	const response = await axios.get<ApiRepoAnalyseResponse>(URL, config);

	return {data: response.data, status: response.status};
};

export interface ILanguageRequestEmailPayload {
	user_name: string;
	user_email: string;
	language_required: string;
	request_type: 'Analyzer Support' | 'Dependency Graph Support';
}

interface ISendEmailServiceApiPayload {
	user_id: string;
	task_id: string;
	email_status: boolean;
	email_id: string;
}
interface Repo {
	url: string;
	branch: string;
}
export interface IRepoCheckResponse {
	repo_url: string;
	status: boolean;
}
export interface IRepoConfig {
	repos: Repo[];
}
export interface IRepoData {
	branch: string;
	git_url: string;
}
export interface IEmailResponse {
	message: string;
	status: string;
}

export interface IExistingRepoData {
	id: string;
	created_at: string;
	repo_data: IRepoData[];
	analysis_type: string;
	name: string;
	status: string;
	task_id: string;
	user_id: string;
	uploaded_file_count: string;
	description: string;
	shared: boolean;
	validity: string;
	access_type: string;
}

interface IGetExistingRepoResponse {
	data: IExistingRepoData[];
}

interface DeleteProjectProps {
	message: string;
	status: string;
}

interface ServiceFile {
	associated_files: string[];
	description: string;
	name: string;
	service_class: string;
	service_type: string;
}
interface IusedServiceNames {
	service_names: ServiceFile[];
}

interface ServicesUsedPayload {
	task_id: string;
	user_id: string;
	git_token: string;
}
interface CustomerServiceApiPayload {
	user_id: string;
	task_id: string;
	name: string;
	user_email: string;
}
export interface ICreateModuleBranchPayload {
	file_path: Array<{
		file_path: string;
		git_url: string;
	}>;
	branch_name: string;
}
export interface GetBranchesProps {
	repo: string;
	owner: string;
	accessToken: string;
	setErrorMessage: (value: boolean) => void;
}
interface Branch {
	name: string;
	commit: {
		sha: string;
		url: string;
	};
	protected: boolean;
}
interface ShareProjectReportThroughMailProps {
	message: string;
	status: string;
}

export interface IModuleDataForSubFeature {
	file_path: string;
	git_url: string;
	branch: string;
}
export interface IModuleDataForSubFeatureProps {
	data: IModuleDataForSubFeature[];
	gitAccessToken: string;
}

interface ConversionResponse {
	data: {
		conversion_id: string;
	};
}

export interface GetAIBasedDescriptionInterface {
	gitAccessToken: string;
	branch_name: string;
	git_url: string;
}

export interface ISyncRepoData {
	task_id: string;
	sync_type: string;
	git_access_token: string;
	user_id: string;
}
export interface INotifyViaEmailSync {
	task_id: string;
	git_access_token: string;
	user_id: string;
}
export type operationType='analyse'|'reanalyse'|'sync'

/**
 * Schedules an email on the completion of the corresponding ingestion task.
 *
 * @param {Object} payload - The payload containing user ID, task ID, and email ID.
 * @param {string} payload.user_id - The ID of the user.
 * @param {string} payload.task_id - The ID of the task.
 * @param {string} payload.email_id - The email ID to which the email should be sent.
 * @returns {Promise<{message: string}>} The response from the API with a message.
 */
const sendEmailService = async ({user_id, task_id, email_id}: Omit<ISendEmailServiceApiPayload, 'email_status'>): Promise<{message: string}> => {
	const URL = `${DEV_APPMOD_BASE_URL}/analyzer/set_email_status`;
	const payload: ISendEmailServiceApiPayload = {
		user_id,
		task_id,
		email_status: true,
		email_id
	};

	console.log('CALLED email');
	const response = await axios.post<{message: string}>(URL, payload);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

export const getBranches = async ({repo, owner, accessToken, setErrorMessage}: GetBranchesProps) => {
	try {
		let branches: Array<string> = [];
		const config = {
			maxBodyLength: Number.POSITIVE_INFINITY,
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		};
		const URL = `https://api.github.com/repos/${owner}/${repo}`;
		const response = await axios.get(URL, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		const defaultBranch = response.data.default_branch as string;
		const fetchBranchesRecursively = async (page: number, activeOwner: string) => {
			setErrorMessage(false);
			try {
				if (response.status === 200) {
					const url = `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100&page=${page}`;

					const apiResponse = await axios.get(url, config);
					if (apiResponse.data) {
						branches = [...branches, ...(apiResponse.data as Branch[]).map((object) => object.name)];

						if (apiResponse.data.length === 100) {
							await fetchBranchesRecursively(page + 1, activeOwner); // Recursive call with next page
						}
					}
				} else if (response.status >= 400) {
					const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
					reactHotTost[variant](description);
				}
			} catch {
				reactHotTost.error('Failed to fetch branches. Please try again');
				return;
			}
		};

		await fetchBranchesRecursively(1, owner);
		if (branches.length > 0) return {defaultBranch, branches};
	} catch {
		setErrorMessage(true);
	}
};

const downloadSqlFileforFeatureGraph = async ({sql_data}: ISqlFileDependenciesAPIResponse) => {
	const URL = `${DEV_APPMOD_BASE_URL}/analyzer/generate-sql-file`;

	const response = await axios.post<ISqlFileDependenciesAPIResponse>(URL, {sql_data});
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

const sendCustomerServiceEmail = async ({user_id, task_id, name, user_email}: CustomerServiceApiPayload) => {
	const URL = `${DEV_APPMOD_BASE_URL}/analyzer/send-email-user-support`;

	const payload: CustomerServiceApiPayload = {
		user_id,
		task_id,
		name,
		user_email
	};

	try {
		toast({
			title: 'Your report has been submitted.',
			variant: 'success'
		});
		const response = await axios.post<{message: string}>(URL, payload);
		if (response.status === 200) {
			if (response.status >= 400) {
				const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
				toast({variant: variant, description: description});
			}
		} else {
			toast({
				title: 'Failed to raise a ticket. Please try again',
				variant: 'error'
			});
		}
	} catch {
		throw new Error('Failed to send customer service email');
	}
};

export const submitFeedbackForProjectAnalysis = async (feedbackData: IFeedbackData) => {
	const url = returnBackendUrl().submit_feedback_project_analysis;
	console.log(feedbackData);
	const response = await axios.post<{
		message?: string;
		status?: string;
	}>(url, feedbackData, {});
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

export const submitFeedbackForFeaturesOverview = async (feedbackData: IFeedbackData) => {
	// https://dev-appmod.techo.camp/analyzer/update-feature-with-feedback
	const url = returnBackendUrl().submit_feedback_project_analysis_features_overview;
	const response = await axios.post<{
		message?: string;
		status?: string;
	}>(url, feedbackData);

	return response;
};

export const fetchFileDependencies = async (parameters: IFetchFileDependenciesParameters): Promise<IFileDependenciesAPIResponse> => {
	const url = `${DEV_APPMOD_BASE_URL}/api/github/file_path_imports`;

	const response = await axios.post<IFileDependenciesAPIResponse>(
		url,
		{
			taskid: parameters.taskid,
			file_path: parameters.file_path,
			repo_url: parameters.repo_url,
			content: true,
			summary: true
		},
		{
			headers: {Authorization: `Bearer ${parameters.token}`},
			withCredentials: true
		}
	);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

export const getFileDependencies = async (parameters: IGetFileDependenciesParameters): Promise<IFileDependenciesAPIResponse> => {
	const url = `${DEV_APPMOD_BASE_URL}/api/github/get_file_path_imports`;

	// Append query parameters to the URL
	const parameters_ = new URLSearchParams({
		taskid: parameters.taskid,
		file_path: parameters.file_path,
		repo_url: parameters.repo_url,
		content: 'true', // Convert boolean values to strings
		summary: parameters.getDescription ?? 'false',
		singlefilecontent: parameters.singlefilecontent ?? 'false'
	}).toString();

	try {
		const response = await axios.get<IFileDependenciesAPIResponse>(`${url}?${parameters_}`, {
			headers: {
				Authorization: `Bearer ${parameters.token}`
			},
			withCredentials: true
		});

		return response.data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			if (error.response && error.response.status >= 400) {
				const {variant, description} = TOAST_MESSAGES_STATUS_MAP[error.response.status];
				toast({variant: variant, description: description});
			}
		} else {
			// Handle cases where error is not AxiosError
			console.error('An unexpected error occurred:', error);
		}
		throw error; // Rethrow the error to allow further handling if needed
	}
};

export const updateFeaturesHierarchy = async (parameters: IUpdateFeaturesHierarchyParameters): Promise<IUpdateFeatureHierarchyResponse> => {
	const url = `${DEV_APPMOD_BASE_URL}/analyzer/user_edit_feature`;

	const response = await axios.post<IUpdateFeatureHierarchyResponse>(url, parameters);

	return response.data;
};

export interface EditSummaryParameters {
	taskId: string;
	userId: string;
	view: 'dashboard' | 'feature';
	editedSummary: string;
}

export interface EditSummaryResponse {
	// Define the response shape here, if you have a specific structure
	success: boolean;
	message?: string;
}

const updateEditedSummaryService = async ({taskId, userId, view, editedSummary}: EditSummaryParameters): Promise<EditSummaryResponse> => {
	const API_URL = `${DEV_APPMOD_BASE_URL}/analyzer/user-edit-summary`;
	try {
		const response = await axios.post<EditSummaryResponse>(
			API_URL,
			{
				task_id: taskId,
				user_id: userId,
				view: view,
				edited_summary: editedSummary
			},
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		return response.data;
	} catch (error) {
		// Handle the error as needed
		const error_ = axios.isAxiosError(error) && error.response ? new Error(`Error: ${error.response.data.message}`) : new Error('An unexpected error occurred');
		throw error_;
	}
};

export const getAllFilesOfProject = async (parameters: IGetAllFilesOfProjectParameters): Promise<Array<IFileOfProject>> => {
	const url = `${DEV_APPMOD_BASE_URL}/api/github/get_files?taskid=${parameters.task_id}`;
	const response = await axios.get<Array<IFileOfProject>>(url);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	const convertApiResponseFormatToUIFriendlyFormat = (files: unknown): IFileOfProject[] => {
		const fileResponseStructureToSend: Array<IFileOfProject> = [];

		for (const repoUrl in files || {}) {
			if (Object.prototype.hasOwnProperty.call(files, repoUrl)) {
				// @ts-ignore
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const filePaths = files[repoUrl];
				for (const filePath of filePaths) {
					fileResponseStructureToSend.push({
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						path: filePath.path,
						git_url: repoUrl
					});
				}
			}
		}

		return fileResponseStructureToSend;
	};

	const responseData = convertApiResponseFormatToUIFriendlyFormat(
		// @ts-ignore
		response.data.files
	);

	return responseData;
};

interface ProjectIngestionServiceProps {
	projectName?: string;
	taskId: string;
	userId: string;
	reposList?: Array<object>; // Optional field
	batchSize?: number; // Optional field
	zipData?: Blob; // Optional field
	regenerate?: boolean;
	gitAccessToken: string;
	egptToken: string;
}
interface ProjectIngestionServiceRequestProps {
	projectName?: string;
	taskId: string;
	userId: string;
	reposList?: Array<object>; // Optional field
	batchSize?: number; // Optional field
	zipData?: Blob; // Optional field
	regenerate?: boolean;
	gitAccessToken: string;
	egptToken: string;
	user_name: string;
	email: string;
}

// Project Ingestion Service Function
const projectIngestionRegenService = async ({reposList, regenerate, projectName, batchSize, zipData, egptToken, gitAccessToken, taskId, userId}: ProjectIngestionServiceProps) => {
	// Show initial loading toast notification

	// Define the ingestion URL
	const githubIngestionUrl = `${DEV_APPMOD_BASE_URL}/analyzer/ingest-project-summary`;

	// Generate FormData with compulsory and optional fields
	const formData = new FormData();

	//   Compulsory fields
	formData.append('task_id', taskId);
	formData.append('user_id', userId);

	// Optional fields
	if (reposList) {
		formData.append('github_info', JSON.stringify(reposList));
	}
	if (reposList) {
		formData.append('project_name', projectName as string);
	}
	if (regenerate) {
		formData.append('regen', JSON.stringify(regenerate));
	}
	if (zipData) {
		formData.append('text_pdf_files', zipData);
	}
	if (batchSize !== undefined) {
		formData.append('batch_size', batchSize.toString());
	}

	// Generate headers
	const headers: AxiosRequestConfig['headers'] = {
		'git-access-token': gitAccessToken,
		'egpt-token': `Bearer ${egptToken}`,
		'Content-Type': 'multipart/form-data'
	};
	// Make the API request
	const ingestionResponse = await axios.post<{
		user_id: string;
		task_id: string;
		status: boolean;
		error?: string;
	}>(githubIngestionUrl, formData, {
		withCredentials: true,
		headers
	});

	return ingestionResponse.data;
};

const projectIngestionRequestThroughEmail = async ({userId, taskId, approverMail,operationType}: {userId: string; taskId: string; approverMail: string,operationType:operationType}) => {
	const URL = `${DEV_APPMOD_BASE_URL}/analyzer/ingest_project_summary_approval_mail`;

	const payload = {
		user_id: userId,
		task_id: taskId,
		approver_mail: approverMail,
		operation_type:operationType 
	};

	const response = await axios.post(URL, payload);
	return response.data;
};

const projectIngestionRegenServiceRequest = async ({reposList, regenerate, projectName, batchSize, zipData, egptToken, gitAccessToken, taskId, userId, user_name, email}: ProjectIngestionServiceRequestProps) => {
	// Show initial loading toast notification

	// Define the ingestion URL
	const githubIngestionUrl = `${DEV_APPMOD_BASE_URL}/analyzer/ingest_project_request`;

	// Generate FormData with compulsory and optional fields
	const formData = new FormData();

	//   Compulsory fields
	formData.append('task_id', taskId);
	formData.append('user_id', userId);

	// Optional fields
	if (reposList) {
		formData.append('github_info', JSON.stringify(reposList));
	}
	if (reposList) {
		formData.append('project_name', projectName as string);
	}
	if (regenerate) {
		formData.append('regen', JSON.stringify(regenerate));
	}
	if (zipData) {
		formData.append('text_pdf_files', zipData);
	}
	if (batchSize !== undefined) {
		formData.append('batch_size', batchSize.toString());
	}
	formData.append('user_name', user_name);
	formData.append('email', email);

	// Generate headers
	const headers: AxiosRequestConfig['headers'] = {
		'git-access-token': gitAccessToken,
		'egpt-token': `Bearer ${egptToken}`,
		'Content-Type': 'multipart/form-data'
	};
	// Make the API request
	const ingestionResponse = await axios.post<{
		user_id: string;
		task_id: string;
		status: boolean;
		error?: string;
		approval_required?: boolean;
		approvers_data?: {project_name: string; email: string}[];
		user_role?: 'approver' | 'normal' | 'null';
	}>(githubIngestionUrl, formData, {
		withCredentials: true,
		headers
	});

	return ingestionResponse.data;
};

const redirectToOpenInVsCodeService = ({repoURL, taskId, userId, filePath, gitToken, branchName}: {repoURL: string; userId: string; taskId: string; gitToken: string; filePath?: string; branchName?: string}) => {
	const BASE_URL = (import.meta.env['VITE_COPILOT_EXTENSION_BASE_URL'] as string) ?? '';
	// const gitTokenEncoded = '';
	const urlParameters = new URLSearchParams({
		repo_url: repoURL,
		branchName: branchName ?? '',
		task_id: taskId,
		user_id: userId,
		git_token: encodeBase64(gitToken)
	});
	if (filePath) urlParameters.set('file_path', filePath);
	window.open(`${BASE_URL}?${urlParameters.toString()}`, '_blank', 'noopener,noreferrer');
};
export const createModuleBranchProjectAnalyser = async (payload: ICreateModuleBranchPayload, gitAccessToken: string) => {
	const createModuleBranchUrl = `${APPMOD_BASE_URL}/analyzer/create_module_branch`;
	const config = {
		headers: {
			'git-access-token': gitAccessToken,
			'Content-Type': 'application/json'
		}
	};
	const apiResponse = await axios.post(createModuleBranchUrl, payload, config);

	return apiResponse.data;
};

const createServicesUsedResponse = async ({task_id, git_token, user_id}: ServicesUsedPayload) => {
	const URL = `${APPMOD_BASE_URL}/analyzer/get_project_services`;

	const config = {
		headers: {
			Authorization: `Bearer ${git_token}`,
			'Content-Type': 'application/json'
		},
		params: {
			task_id,
			user_id,
			git_token
		}
	};

	const response = await axios.get<IusedServiceNames>(URL, config);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data; // Return the data directly
};
/**
 * Creates a project report by sending the GitHub repository link and project name to the API.
 *
 * @param {Object} payload - The payload containing the GitHub repo link and project name.
 * @param {string[]} payload.github_repo_link - The array of GitHub repository links.
 * @param {string} payload.project_name - The name of the project.
 * @param {string} payload.token - The authorization token for the API request.
 * @returns {Promise<ICreateProjectReportResponse>} The response from the API with project details and a message.
 */
const createProjectReportService = async ({github_repo_link, project_name, token}: ICreateProjectReportPayload) => {
	const URL = `${APPMOD_BASE_URL}/api/create_project_report`;

	const config = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	};

	const payload = {
		github_repo_link,
		project_name
	};

	const response = await axios.post<ICreateProjectReportResponse>(URL, payload, config);

	return response.data;
};

/**
 * Assigns a list of customer success IDs to a project and repo URL.
 *
 * @param {IAssignCsToProjectPayload} payload - The payload containing the project name, repo URL, and customer success IDs.
 * @returns {Promise<IAssignCsToProjectResponse>} The response from the API with a message.
 */
const assignCsToProjectService = async ({project_name, repo_url, cs_id}: IAssignCsToProjectPayload) => {
	const URL = `${APPMOD_BASE_URL}/api/assign_cs_to_project`;

	const config = {
		headers: {
			'Content-Type': 'application/json'
		}
	};

	const response = await axios.post<IAssignCsToProjectResponse>(URL, {project_name, repo_url, cs_id}, config);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

const projectAnalyserModuleConversionForSubFeature = async (data: ModuleBranchCreationPayload, gitAccessToken: string) => {
	const URL = `${APPMOD_BASE_URL}/api/micro_module_conversion`;
	const config = {
		headers: {
			'git-access-token': gitAccessToken,
			'Content-Type': 'application/json'
		}
	};
	const apiResponse = await axios.post<ConversionResponse>(URL, data, config);

	return apiResponse.data;
};

const fetchCombinedDataForModuleConversionAndTestCasePanel = async (taskId: string, userId: string, signal: AbortSignal, accessToken: string): Promise<ITaskStats> => {
	const url = `${import.meta.env.VITE_AI_BASE_URL}/api/combined-task-data`;
	const response = await axios.get<ITaskStats>(url, {
		params: {taskId, userId},
		headers: {Authorization: `Bearer ${accessToken}`},
		signal
	});
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};
const moduleConversionBranchesCreation = async (conversionId: string, gitAccessToken: string) => {
	const URL = `${APPMOD_BASE_URL}/api/get_branch_info?conversion_id=${conversionId}`;

	const config = {
		headers: {
			'git-access-token': gitAccessToken,
			'Content-Type': 'application/json'
		}
	};

	const response = await axios.get<
		Array<{
			branch_name: string;
			branch_url: string;
			git_url: string;
		}>
	>(URL, config);
	const processedData = {
		data: response.data
	};
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return processedData;
};

const ModuleConversion = async (conversion_id: string, gitAccessToken: string) => {
	const URL = `${APPMOD_BASE_URL}/api/module_conversion`;
	const config = {
		headers: {
			'git-access-token': gitAccessToken,
			'Content-Type': 'application/json'
		}
	};
	const payload = {
		conversion_id: conversion_id
	};
	const response = await axios.post<IModuleConversionResponse>(URL, payload, config);
	if (response.status >= 400) {
		const {variant, description} = TOAST_MESSAGES_STATUS_MAP[response.status];
		toast({variant: variant, description: description});
	}
	return response.data;
};

const getExistingRepos = async (userId: string) => {
	const URL = `${APPMOD_BASE_URL}/analyzer/get_exisiting_repo`;
	const config = {
		params: {
			user_id: userId
		},
		headers: {
			'Content-Type': 'application/json'
		}
	};
	const response = await axios.get<IGetExistingRepoResponse>(URL, config);
	return response.data;
};

const projectDeletion = async (userId: string, taskId: string, repoData: IRepoData[]) => {
	const URL = `${APPMOD_BASE_URL}/analyzer/delete_existing_repo`;
	const payload = {
		user_id: userId,
		task_id: taskId,
		repo_data: repoData
	};
	const response = await axios.post<DeleteProjectProps>(URL, payload);

	return response.data;
};

const shareProjectAnalysisThroughMail = async (userId: string, taskId: string, emailIds: Array<string>, projectName: string, userName: string, accessType: string, validity: string) => {
	const URL = `${APPMOD_BASE_URL}/analyzer/share_project`;
	const payload = {
		user_id: userId,
		task_id: taskId,
		email_ids: emailIds,
		user_name: userName,
		project_name: projectName,
		validity: validity,
		access_type: accessType
	};
	const response = await axios.post<ShareProjectReportThroughMailProps>(URL, payload);
	return response;
};
const getAiBasedDescription = async (payload: GetAIBasedDescriptionInterface) => {
	const url = `${APPMOD_BASE_URL}/analyzer/generate_description`;
	const apiPayload = {
		git_url: payload?.git_url,
		branch_name: payload?.branch_name
	};
	const response = await axios.post(url, apiPayload, {
		headers: {
			'git-access-token': payload?.gitAccessToken
		},
		timeout: 6000
	});
	return response?.data;
};

export {
	createServicesUsedResponse,
	fetchRepoAnalyseData,
	assignCsToProjectService,
	createProjectReportService,
	redirectToOpenInVsCodeService,
	projectIngestionRegenService,
	sendEmailService,
	updateEditedSummaryService,
	sendCustomerServiceEmail,
	projectAnalyserModuleConversionForSubFeature,
	fetchCombinedDataForModuleConversionAndTestCasePanel,
	moduleConversionBranchesCreation,
	getExistingRepos,
	downloadSqlFileforFeatureGraph,
	ModuleConversion,
	projectDeletion,
	getAiBasedDescription,
	shareProjectAnalysisThroughMail,
	projectIngestionRegenServiceRequest,
	projectIngestionRequestThroughEmail
};
