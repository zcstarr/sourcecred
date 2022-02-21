// @flow

import type {Plugin, PluginDirectoryContext} from "../../api/plugin";
import type {PluginId} from "../../api/pluginId";
import path from "path";
import type {PluginDeclaration} from "../../analysis/pluginDeclaration";
import {type TaskReporter} from "../../util/taskReporter";
import type {ReferenceDetector} from "../../core/references";
import {type WeightedGraph} from "../../core/weightedGraph";
import type {IdentityProposal} from "../../core/ledger/identityProposal";


function isConstructor(f) {
  try {
    new f();
  } catch (err) {
    // verify err is the expected error and then
    return false;
  }
  return true;
}
export class PackagePlugin implements Plugin {
  id: PluginId;
  plugin: Plugin;

  constructor(options: {|+pluginId: PluginId|}) {
    this.id = options.pluginId;
  }

  async loadPlugin(): Promise<void> {
    if (this.plugin !== undefined) return;

    const pluginModule = this.id.startsWith("./")
      ? path.resolve(process.cwd(), this.id)
      : this.id;
    try {
      const importedPlugin = await import(/* webpackIgnore: true */pluginModule);
      if (isConstructor(importedPlugin.default)){
        this.plugin = new importedPlugin.default();
      } //.default.default is a possible artifact of babeljs transpilation
      else if(importedPlugin.default && isConstructor(importedPlugin.default.default)){
        this.plugin = new importedPlugin.default.default();
      }else{
        this.plugin = new importedPlugin();
      }
    } catch (e) {
      throw new Error(
        `Could not load dynamically imported plugin: ${e.message}`
      );
    }
  }

  async declaration(): Promise<PluginDeclaration> {
    await this.loadPlugin();
    return this.plugin.declaration();
  }

  async load(
    ctx: PluginDirectoryContext,
    reporter: TaskReporter
  ): Promise<void> {
    await this.loadPlugin();
    return this.plugin.load(ctx, reporter);
  }

  async graph(
    ctx: PluginDirectoryContext,
    rd: ReferenceDetector,
    reporter: TaskReporter
  ): Promise<WeightedGraph> {
    await this.loadPlugin();
    return this.plugin.graph(ctx, rd, reporter);
  }

  async referenceDetector(
    ctx: PluginDirectoryContext,
    reporter: TaskReporter
  ): Promise<ReferenceDetector> {
    await this.loadPlugin();
    return this.plugin.referenceDetector(ctx, reporter);
  }

  async identities(
    ctx: PluginDirectoryContext,
    reporter: TaskReporter
  ): Promise<$ReadOnlyArray<IdentityProposal>> {
    await this.loadPlugin();
    return this.plugin.identities(ctx, reporter);
  }
}
