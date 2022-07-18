// Drag & Drop
interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
  }
  
  interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
  }
  
  // Project Type
  enum ProjectStatus {
    Active,
    Finished,
  }
  
  class Project {
    constructor(
      public id: string,
      public title: string,
      public status: ProjectStatus,
    ) {}
  }
  
  // Project State Management
  type Listener<T> = (items: T[]) => void;
  
  class State<T> {
    protected listeners: Listener<T>[] = [];
  
    addListener(listenerFn: Listener<T>) {
      this.listeners.push(listenerFn);
    }
  }
  
  class ProjectState extends State<Project> {
    private projects: Project[] = [];
    private static instance: ProjectState;
  
    private constructor() {
      super();
    }
  
    static getInstance() {
      if (this.instance) {
        return this.instance;
      }
      this.instance = new ProjectState();
      return this.instance;
    }
  
    addProject(title: string) {
      const newProject = new Project(
        Math.random().toString(),
        title,
        ProjectStatus.Active,
      );
      this.projects.push(newProject);
      this.updateListeners();
    }
  
    moveProject(projectId: string, newStatus: ProjectStatus) {
      const project = this.projects.find(prj => prj.id === projectId);
      if (project && project.status !== newStatus) {
        project.status = newStatus;
        this.updateListeners();
      }
    }
  
    private updateListeners() {
      for (const listenerFn of this.listeners) {
        listenerFn(this.projects.slice());
      }
    }
  }
  
  const projectState = ProjectState.getInstance();
  
  // Validation
  interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  }
  
  function validate(validatableInput: Validatable) {
    let isValid = true;
    if (validatableInput.required) {
      isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if (
      validatableInput.minLength != null &&
      typeof validatableInput.value === 'string'
    ) {
      isValid =
        isValid && validatableInput.value.length >= validatableInput.minLength;
    }
    if (
      validatableInput.maxLength != null &&
      typeof validatableInput.value === 'string'
    ) {
      isValid =
        isValid && validatableInput.value.length <= validatableInput.maxLength;
    }
    if (
      validatableInput.min != null &&
      typeof validatableInput.value === 'number'
    ) {
      isValid = isValid && validatableInput.value >= validatableInput.min;
    }
    if (
      validatableInput.max != null &&
      typeof validatableInput.value === 'number'
    ) {
      isValid = isValid && validatableInput.value <= validatableInput.max;
    }
    return isValid;
  }
  
  // autobind decorator
  function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
      configurable: true,
      get() {
        const boundFn = originalMethod.bind(this);
        return boundFn;
      },
    };
    return adjDescriptor;
  }
  
  // Component Class
  abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;
  
    constructor(
      templateId: string,
      hostElementId: string,
      insertAtStart: boolean,
      newElementId?: string,
    ) {
      this.templateElement = document.getElementById(
        templateId,
      )! as HTMLTemplateElement;
      this.hostElement = document.getElementById(hostElementId)! as T;
  
      const importedNode = document.importNode(
        this.templateElement.content,
        true,
      );
      this.element = importedNode.firstElementChild as U;
      if (newElementId) {
        this.element.id = newElementId;
      }
  
      this.attach(insertAtStart);
    }
  
    abstract configure(): void;
    abstract renderContent(): void;
  
    private attach(insertAtBeginning: boolean) {
      this.hostElement.insertAdjacentElement(
        insertAtBeginning ? 'afterbegin' : 'beforeend',
        this.element,
      );
    }
  }
  
  // ProjectItem Class
  class ProjectItem extends Component<HTMLUListElement, HTMLLIElement>
    implements Draggable {
    private project: Project;
  
    constructor(hostId: string, project: Project) {
      super('single-project', hostId, false, project.id);
      this.project = project;
  
      this.configure();
      this.renderContent();
    }
  
    @autobind
    dragStartHandler(event: DragEvent) {
      event.dataTransfer!.setData('text/plain', this.project.id);
      event.dataTransfer!.effectAllowed = 'move';
    }
  
    dragEndHandler(_: DragEvent) {
      console.log('Drag終了');
    }
  
    configure() {
      this.element.addEventListener('dragstart', this.dragStartHandler);
      this.element.addEventListener('dragend', this.dragEndHandler);
    }
  
    renderContent() {
      this.element.querySelector('h2')!.textContent = this.project.title;
    }
  }
  
  // ProjectList Class
  class TodoList extends Component<HTMLDivElement, HTMLElement>
    implements DragTarget {
    assignedProjects: Project[];
  
    constructor(private type: 'active' | 'finished') {
      super('project-list', 'app', false, `${type}-projects`);
      this.assignedProjects = [];
  
      this.configure();
      this.renderContent();
    }
  
    @autobind
    dragOverHandler(event: DragEvent) {
      if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
        event.preventDefault();
        const listEl = this.element.querySelector('ul')!;
        listEl.classList.add('droppable');
      }
    }
  
    @autobind
    dropHandler(event: DragEvent) {
      const prjId = event.dataTransfer!.getData('text/plain');
      projectState.moveProject(
        prjId,
        this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished,
      );
    }
  
    @autobind
    dragLeaveHandler(_: DragEvent) {
      const listEl = this.element.querySelector('ul')!;
      listEl.classList.remove('droppable');
    }
  
    configure() {
      this.element.addEventListener('dragover', this.dragOverHandler);
      this.element.addEventListener('drop', this.dropHandler);
      this.element.addEventListener('dragleave', this.dragLeaveHandler);
  
      projectState.addListener((projects: Project[]) => {
        const relevantProjects = projects.filter(prj => {
          if (this.type === 'active') {
            return prj.status === ProjectStatus.Active;
          }
          return prj.status === ProjectStatus.Finished;
        });
        this.assignedProjects = relevantProjects;
        this.renderProjects();
      });
    }
  
    renderContent() {
      const listId = `${this.type}-projects-list`;
      this.element.querySelector('ul')!.id = listId;
      this.element.querySelector('h2')!.textContent =
        this.type === 'active' ? '今日のTODO' : '完了したTODO';
    }
  
    private renderProjects() {
      const listEl = document.getElementById(
        `${this.type}-projects-list`,
      )! as HTMLUListElement;
      listEl.innerHTML = '';
      for (const prjItem of this.assignedProjects) {
        new ProjectItem(listEl.id, prjItem);
      }
    }
  }
  
  // ① ProjectInput Class
  class TodoInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
  
    constructor() {
      super('project-input', 'app', true, 'user-input');
  
      this.titleInputElement = this.element.querySelector(
        '#title',
      ) as HTMLInputElement;
  
      this.configure();
    }
  
    configure() {
      this.element.addEventListener('submit', this.submitHandler);
    }
  
    renderContent() {}
  
    private gatherUserInput(): [string] | void {
      const enteredTitle = this.titleInputElement.value;
  
      const titleValidatable: Validatable = {
        value: enteredTitle,
        required: true,
      };
      if (
        !validate(titleValidatable)
      ) {
        alert('入力値が正しくありません。再度お試しください。');
        return;
      } else {
        return [enteredTitle];
      }
    }
  
    private clearInputs() {
      this.titleInputElement.value = '';
    }
  
    @autobind
    private submitHandler(event: Event) {
      event.preventDefault();
      const userInput = this.gatherUserInput();
      if (Array.isArray(userInput)) {
        const [title] = userInput;
        projectState.addProject(title);
        this.clearInputs();
      }
    }
  }
  
  const prjInput = new TodoInput();
  const activePrjList = new TodoList('active');
  const finishedPrjList = new TodoList('finished');