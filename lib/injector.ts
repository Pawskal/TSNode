import 'reflect-metadata'
import { UserController } from '../example/modules/user.controller';
import { Type, IController, IRoutes, IAuthOption } from './interfaces';
import { Controller, Service, Authorization, Get, Post, Patch, Put, Delete } from './decorators'

export default class Injector  {
  public static getInstance(): Injector {
    return new Injector();
  }

  private static _instance: Injector;
  
  public static Controller: Function = Controller.bind(Injector.getInstance());

  public static Service: Function = Service.bind(Injector.getInstance());

  public static Authorization: Function = Authorization.bind(Injector.getInstance());

  public static Get: Function = Get.bind(Injector.getInstance());

  public static Post: Function = Post.bind(Injector.getInstance());

  public static Put: Function = Put.bind(Injector.getInstance());

  public static Patch: Function = Patch.bind(Injector.getInstance()); 

  public static Delete: Function = Delete.bind(Injector.getInstance());

  private injections: Map<string, Type<any>> = new Map<string, Type<any>>();

  private instances: Map<string, any> = new Map<string, any>();

  public controllers: Map<string, IController> = new Map<string, IController>();

  private constructor() {
    return Injector._instance || (Injector._instance = this);
  }

  resolve<T>(targetName: string): T {
    if(this.instances.has(targetName)){
      return this.instances.get(targetName);
    }
    const target: Type<T> = this.injections.get(targetName);
    const tokens: Array<FunctionConstructor> = Reflect.getMetadata('design:paramtypes', target) || [];
    const instances: Array<T> = tokens.map(t => this.resolve<any>(t.name)) || [];
    this.instances.set(targetName, new target(...instances))
    return this.instances.get(targetName);
  }

  public setInstance(target: any): void {
    this.instances.set(target.constructor.name, target);
  }

  public set(target: Type<any>): void {
    this.injections.set(target.name, target);
  }

  private defineRoute(method: string, type: string, target: Type<any>,
                      path: string, fname: string, descriptor: PropertyDescriptor, authOption?: IAuthOption) : void {
    if(!this.controllers.has(target.constructor.name)) {
      this.controllers.set(target.constructor.name, {
        routes: new Map<string, IRoutes>()
      })
    }
    const controller: IController = this.controllers.get(target.constructor.name)
    const route: IRoutes = controller.routes.get(path) || {}
    controller.routes.set(path, Object.assign(route, { 
      [method]: {
        auth: authOption && authOption.auth,
        [type] : {
          name: fname,
          handler: descriptor.value as Function
        }
      }
    }));
  }
}
