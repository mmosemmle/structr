/*
 * Copyright (C) 2010-2017 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
var main, contentsMain, contentTree, contentsContents;
var selectedElements = [];
var currentContentContainer;
var containerPageSize = 10000, containerPage = 1;
var currentContentContainerKey = 'structrCurrentContentContainer_' + port;
var contentsResizerLeftKey = 'structrContentsResizerLeftKey_' + port;

$(document).ready(function() {

	Structr.registerModule(_Contents);
	_Contents.resize();

});

var _Contents = {
	_moduleName: 'contents',
	init: function() {
		_Logger.log(_LogType.CONTENTS, '_Contents.init');

		main = $('#main');
		main.append('<div class="searchBox module-dependend" data-structr-module="text-search"><input class="search" name="search" placeholder="Search..."><i class="clearSearchIcon ' + _Icons.getFullSpriteClass(_Icons.grey_cross_icon) + '" /></div>');

		searchField = $('.search', main);
		searchField.focus();

		searchField.keyup(function(e) {

			var searchString = $(this).val();
			if (searchString && searchString.length && e.keyCode === 13) {

				$('.clearSearchIcon').show().on('click', function() {
					_Contents.clearSearch();
				});

				_Contents.fulltextSearch(searchString);

			} else if (e.keyCode === 27 || searchString === '') {
				_Contents.clearSearch();
			}

		});

		Structr.makePagesMenuDroppable();
		Structr.adaptUiToPresentModules();
	},
	resize: function() {

		var windowHeight = $(window).height();
		var headerOffsetHeight = 100;

		if (contentTree) {
			contentTree.css({
				height: windowHeight - headerOffsetHeight + 'px'
			});
		}

		if (contentsContents) {
			contentsContents.css({
				height: windowHeight - headerOffsetHeight - 55 + 'px'
			});
		}

		_Contents.moveResizer();
		Structr.resize();

	},
	moveResizer: function(left) {
		left = left || LSWrapper.getItem(contentsResizerLeftKey) || 300;
		$('.column-resizer', contentsMain).css({ left: left });

		$('#contents-tree').css({width: left - 14 + 'px'});
		$('#contents-contents').css({left: left + 8 + 'px', width: $(window).width() - left - 58 + 'px'});
	},
	onload: function() {

		_Contents.init();

		Structr.updateMainHelpLink('https://support.structr.com/knowledge-graph');

		main.append('<div id="contents-main"><div class="column-resizer"></div><div class="fit-to-height" id="content-tree-container"><div id="contents-tree"></div></div><div class="fit-to-height" id="contents-contents-container"><div id="contents-contents"></div></div>');
		contentsMain = $('#contents-main');

		contentTree = $('#contents-tree');
		contentsContents = $('#contents-contents');

		_Contents.moveResizer();
		Structr.initVerticalSlider($('.column-resizer', contentsMain), contentsResizerLeftKey, 204, _Contents.moveResizer);

		var contentsContentsContainer = $('#contents-contents-container');

		var selectWrapper = $('<div></div>');
		contentsContentsContainer.prepend(selectWrapper);

		var containerTypesWrapper = $('<span><select id="add-content-container"><option value="">Add Content Container</option></select></span>');
		var containerTypesSelector = $('#add-content-container', containerTypesWrapper);
		selectWrapper.append(containerTypesWrapper);

		Command.query('SchemaNode', 1000, 1, 'name', 'asc', { extendsClass: 'org.structr.web.entity.ContentContainer' }, function(schemaNodes) {
			schemaNodes.forEach(function(schemaNode) {
				var type = schemaNode.name;
				containerTypesSelector.append('<option value="' + type + '">' + type + '</option>');
			});

			if (schemaNodes.length === 0) {
				Structr.appendHelpTextToElement("You need to create a custom type extending <b>org.structr.web.entity.<u>ContentContainer</u></b> to add ContentContainers", containerTypesWrapper, {
					marginLeft: '4px',
					marginRight: '4px'
				});
			}

		}, true);

		containerTypesSelector.on('change', function(e) {
			e.stopPropagation();
			var sel = $(this);
			var type = sel.val();
			if (type) {
				Command.create({ type: type, parent: currentContentContainer ? currentContentContainer.id : null }, function(f) {
					_Contents.appendItemOrContainerRow(f);
					_Contents.refreshTree();
					containerTypesSelector.prop('selectedIndex', 0);
				});
			}
		});

		var itemTypesWrapper = $('<span><select id="add-content-item"><option value="">Add Content Item</option></select></span>');
		var itemTypesSelector = $('#add-content-item', itemTypesWrapper);
		selectWrapper.append(itemTypesWrapper);

		Command.query('SchemaNode', 1000, 1, 'name', 'asc', { extendsClass: 'org.structr.web.entity.ContentItem' }, function(schemaNodes) {
			schemaNodes.forEach(function(schemaNode) {
				var type = schemaNode.name;
				itemTypesSelector.append('<option value="' + type + '">' + type + '</option>');
			});

			if (schemaNodes.length === 0) {
				Structr.appendHelpTextToElement("You need to create a custom type extending <b>org.structr.web.entity.<u>ContentItem</u></b> to add ContentItem", itemTypesWrapper, {
					marginLeft: '4px',
					marginRight: '4px'
				});
			}

		}, true);

		itemTypesSelector.on('change', function(e) {
			e.stopPropagation();
			var sel = $(this);
			var type = sel.val();
			if (type) {
				var containers = (currentContentContainer ? [ { id : currentContentContainer.id } ] : null);
				Command.create({ type: type, size: 0, containers: containers }, function(f) {
					_Contents.appendItemOrContainerRow(f);
					_Contents.refreshTree();
					itemTypesSelector.prop('selectedIndex', 0);
				});
			}
		});

		$.jstree.defaults.core.themes.dots      = false;
		$.jstree.defaults.dnd.inside_pos        = 'last';
		$.jstree.defaults.dnd.large_drop_target = true;

		contentTree.on('ready.jstree', function() {
			_TreeHelper.makeTreeElementDroppable(contentTree, 'root');

			_Contents.loadAndSetWorkingDir(function() {
				if (currentContentContainer) {
					_Contents.deepOpen(currentContentContainer);
				}
			});
		});

		contentTree.on('select_node.jstree', function(evt, data) {

			if (data.node.id === 'root') {
				_Contents.deepOpen(currentContentContainer, []);
			}

			_Contents.setWorkingDirectory(data.node.id);
			_Contents.displayContainerContents(data.node.id, data.node.parent, data.node.original.path, data.node.parents);

		});

		_TreeHelper.initTree(contentTree, _Contents.treeInitFunction, 'structr-ui-contents');

		$(window).off('resize').resize(function() {
			_Contents.resize();
		});

		Structr.unblockMenu(100);

		_Contents.resize();

	},
	deepOpen: function(d, dirs) {

		_TreeHelper.deepOpen(contentTree, d, dirs, 'parent', (currentContentContainer ? currentContentContainer.id : 'root'));

	},
	refreshTree: function() {

		_TreeHelper.refreshTree(contentTree, function() {
			_TreeHelper.makeTreeElementDroppable(contentTree, 'root');
		});

	},
	treeInitFunction: function(obj, callback) {

		switch (obj.id) {

			case '#':

				var defaultEntries = [{
					id: 'root',
					text: '/',
					children: true,
					icon: _Icons.structr_logo_small,
					path: '/',
					state: {
						opened: true,
						selected: true
					}
				}];

				callback(defaultEntries);

				break;

			case 'root':
				_Contents.load(null, callback);
				break;

			default:
				_Contents.load(obj.id, callback);
				break;
		}

	},
	unload: function() {
		fastRemoveAllChildren($('.searchBox', main));
		fastRemoveAllChildren($('#contents-main', main));
	},
	fulltextSearch: function(searchString) {
		contentsContents.children().hide();

		var url;
		if (searchString.contains(' ')) {
			url = rootUrl + 'ContentItem/ui?loose=1';
			searchString.split(' ').forEach(function(str, i) {
				url = url + '&name=' + str;
			});
		} else {
			url = rootUrl + 'ContentItem/ui?name=' + searchString;
		}

		_Contents.displaySearchResultsForURL(url);
	},
	clearSearch: function() {
		$('.search', main).val('');
		$('#search-results').remove();
		contentsContents.children().show();
	},
	loadAndSetWorkingDir: function(callback) {

		currentContentContainer = LSWrapper.getItem(currentContentContainerKey);
		callback();

	},
	load: function(id, callback) {

		Command.query('ContentContainer', containerPageSize, containerPage, 'name', 'asc', {parent: id}, function(folders) {

			var list = [];

			folders.forEach(function(d) {
				var childCount = (d.items && d.items.length > 0) ? ' (' + d.items.length + ')' : '';
				list.push({
					id: d.id,
					text: (d.name ? d.name : '[unnamed]') + childCount,
					children: d.isContentContainer && d.childContainers.length > 0,
					icon: 'fa fa-folder-o',
					path: d.path
				});
			});

			callback(list);

			_TreeHelper.makeDroppable(contentTree, list);

		}, true);

	},
	setWorkingDirectory: function(id) {

		if (id === 'root') {
			currentContentContainer = null;
		} else {
			currentContentContainer = { 'id': id };
		}

		LSWrapper.setItem(currentContentContainerKey, currentContentContainer);
	},
	displayContainerContents: function(id, parentId, nodePath, parents) {

		fastRemoveAllChildren(contentsContents[0]);
		var path = '';
		if (parents) {
			parents = [].concat(parents).reverse().slice(1);
			var pathNames = nodePath.split('/');
			pathNames[0] = '/';
			path = parents.map(function(parent, idx) {
				return '<a class="breadcrumb-entry" data-folder-id="' + parent + '"><i class="fa fa-caret-right"></i> ' + pathNames[idx] + '</span></a>';
			}).join(' ');
			path += ' <i class="fa fa-caret-right"></i> ' + pathNames.pop();
		}

		var handleChildren = function(children) {
			if (children && children.length) {
				children.forEach(_Contents.appendItemOrContainerRow);
			}
		};

		if (id === 'root') {
			Command.list('ContentContainer', true, 1000, 1, 'name', 'asc', null, handleChildren);
		} else {
			Command.query('ContentContainer', 1000, 1, 'name', 'asc', {parent: id}, handleChildren, true, 'ui');
		}

		_Pager.initPager('contents-items', 'ContentItem', 1, 25, 'name', 'asc');
		page['ContentItem'] = 1;
		_Pager.initFilters('contents-items', 'ContentItem', id === 'root' ? {} : { containers: [id] });

		var itemsPager = _Pager.addPager('contents-items', contentsContents, false, 'ContentItem', 'ui', handleChildren);

		itemsPager.cleanupFunction = function () {
			var toRemove = $('.node.item', itemsPager.el).closest('tr');
			toRemove.each(function(i, elem) {
				fastRemoveAllChildren(elem);
			});
		};

		itemsPager.pager.append('Filter: <input type="text" class="filter" data-attribute="name">');
		itemsPager.pager.append('<input type="text" class="filter" data-attribute="parentId" value="' + ((parentId === '#') ? '' : id) + '" hidden>');
		itemsPager.pager.append('<input type="checkbox" class="filter" data-attribute="hasParent" ' + ((parentId === '#') ? '' : 'checked') + ' hidden>');
		itemsPager.activateFilterElements();

		contentsContents.append(
				'<h2>' + path + '</h2>'
				+ '<table id="files-table" class="stripe"><thead><tr><th class="icon">&nbsp;</th><th>Name</th><th>Size</th><th>Type</th><th>Owner</th>><th>Modified</th></tr></thead>'
				+ '<tbody id="files-table-body">'
				+ ((id !== 'root') ? '<tr id="parent-file-link"><td class="file-type"><i class="fa fa-folder-o"></i></td><td><a href="#">..</a></td><td></td><td></td><td></td><td></td></tr>' : '')
				+ '</tbody></table>'
		);

		$('.breadcrumb-entry').click(function (e) {
			e.preventDefault();

			$('#' + $(this).data('folderId') + '_anchor').click();

		});

		$('#parent-file-link').on('click', function(e) {

			if (parentId !== '#') {
				$('#' + parentId + '_anchor').click();
			}
		});

	},
	appendItemOrContainerRow: function(d) {

		// add container/item to global model
		StructrModel.createFromData(d, null, false);

		var tableBody = $('#files-table-body');

		$('#row' + d.id, tableBody).remove();

		var items = d.items || [];
		var containers = d.containers || [];
		var size = d.isContentContainer ? containers.length + items.length : (d.size ? d.size : '-');

		var rowId = 'row' + d.id;
		tableBody.append('<tr id="' + rowId + '"' + (d.isThumbnail ? ' class="thumbnail"' : '') + '></tr>');
		var row = $('#' + rowId);
		var icon = d.isContentContainer ? 'fa-folder-o' : _Contents.getIcon(d);

		if (d.isContentContainer) {
			row.append('<td class="file-type"><i class="fa ' + icon + '"></i></td>');
			row.append('<td><div id="id_' + d.id + '" data-structr_type="folder" class="node container"><b title="' + d.name + '" class="name_">' + fitStringToWidth(d.name, 200) + '</b> <span class="id">' + d.id + '</span></div></td>');
		} else {
			row.append('<td class="file-type"><a href="javascript:void(0)"><i class="fa ' + icon + '"></i></a></td>');
			row.append('<td><div id="id_' + d.id + '" data-structr_type="item" class="node item"><b title="' +  (d.name ? d.name : '[unnamed]') + '" class="name_">' + (d.name ? fitStringToWidth(d.name, 200) : '[unnamed]') + '</b></td>');
			$('.file-type', row).on('click', function() {
				_Contents.editItem(d);
			});

		}

		$('.item-title b', row).on('click', function() {
			_Contents.editItem(d);
		});

		row.append('<td>' + size + '</td>');
		row.append('<td>' + d.type + (d.isThumbnail ? ' thumbnail' : '') + (d.isFile && d.contentType ? ' (' + d.contentType + ')' : '') + '</td>');
		row.append('<td>' + (d.owner ? (d.owner.name ? d.owner.name : '[unnamed]') : '') + '</td>');
		row.append('<td>' + moment(d.lastModifiedDate).calendar() + '</td>');

		// Change working dir by click on folder icon
		$('#id_' + d.id + '.container').parent().prev().on('click', function(e) {

			e.preventDefault();
			e.stopPropagation();

			if (d.parentId) {

				contentTree.jstree('open_node', $('#' + d.parentId), function() {

					if (d.name === '..') {
						$('#' + d.parentId + '_anchor').click();
					} else {
						$('#' + d.id + '_anchor').click();
					}

				});

			} else {

				$('#' + d.id + '_anchor').click();
			}

			return false;
		});

		var div = Structr.node(d.id);

		if (!div || !div.length)
			return;

		div.on('remove', function() {
			div.closest('tr').remove();
		});

		_Entities.appendAccessControlIcon(div, d);
		var delIcon = div.children('.delete_icon');
		if (d.isContentContainer) {

			// ********** Containers **********

			var newDelIcon = '<i title="Delete container \'' + d.name + '\'" class="delete_icon button ' + _Icons.getFullSpriteClass(_Icons.delete_icon) + '" />';
			if (delIcon && delIcon.length) {
				delIcon.replaceWith(newDelIcon);
			} else {
				div.append(newDelIcon);
			}
			div.children('.delete_icon').on('click', function(e) {
				e.stopPropagation();
				_Entities.deleteNode(this, d, true, function() {
					_Contents.refreshTree();
				});
			});

			div.droppable({
				accept: '.container, .item',
				greedy: true,
				hoverClass: 'nodeHover',
				tolerance: 'pointer',
				drop: function(e, ui) {

					e.preventDefault();
					e.stopPropagation();

					var self = $(this);
					var itemId = Structr.getId(ui.draggable);
					var containerId = Structr.getId(self);
					_Logger.log(_LogType.CONTENTS, 'itemId, containerId', itemId, containerId);

					if (!(itemId === containerId)) {
						var nodeData = {};
						nodeData.id = itemId;

						_Entities.addToCollection(itemId, containerId, 'containers', function() {
							$(ui.draggable).remove();
							_Contents.refreshTree();
						});
					}
					return false;
				}
			});

		} else {

			// ********** Items **********

			div.children('.typeIcon').on('click', function(e) {
				e.stopPropagation();
				window.open(file.path, 'Download ' + file.name);
			});
			var newDelIcon = '<i title="Delete item ' + d.name + '\'" class="delete_icon button ' + _Icons.getFullSpriteClass(_Icons.delete_icon) + '" />';
			if (delIcon && delIcon.length) {
				delIcon.replaceWith(newDelIcon);
			} else {
				div.append(newDelIcon);
				delIcon = div.children('.delete_icon');
			}
			div.children('.delete_icon').on('click', function(e) {
				e.stopPropagation();
				_Entities.deleteNode(this, d);
			});

			_Contents.appendEditFileIcon(div, d);

		}

		div.draggable({
			revert: 'invalid',
			//helper: 'clone',
			containment: 'body',
			stack: '.jstree-node',
			appendTo: '#main',
			forceHelperSize: true,
			forcePlaceholderSize: true,
			distance: 5,
			cursorAt: { top: 8, left: 25 },
			zIndex: 99,
			stop: function(e, ui) {
				$(this).show();
				$(e.toElement).one('click', function(e) {
					e.stopImmediatePropagation();
				});
			},
			helper: function(event) {
				var helperEl = $(this);
				selectedElements = $('.node.selected');
				if (selectedElements.length > 1) {
					selectedElements.removeClass('selected');
					return $('<i class="node-helper ' + _Icons.getFullSpriteClass(_Icons.page_white_stack_icon) + '">');
				}
				var hlp = helperEl.clone();
				hlp.find('.button').remove();
				return hlp;
			}
		});

		_Entities.appendEditPropertiesIcon(div, d);
		_Entities.setMouseOver(div);
		_Entities.makeSelectable(div);

	},
	checkValueHasChanged: function(oldVal, newVal, buttons) {

		if (newVal === oldVal) {

			buttons.forEach(function(button) {
				button.prop("disabled", true).addClass('disabled');
			});

		} else {

			buttons.forEach(function(button) {
				button.prop("disabled", false).removeClass('disabled');
			});
		}
	},
	editItem: function(item) {

		Structr.dialog('Edit ' + item.name, function() {
			_Logger.log(_LogType.CONTENTS, 'content saved');
		}, function() {
			_Logger.log(_LogType.CONTENTS, 'cancelled');
		});

		Command.get(item.id, function(entity) {

			dialogBtn.append('<button id="saveItem" disabled="disabled" class="disabled"> Save </button>');
			dialogBtn.append('<button id="saveAndClose" disabled="disabled" class="disabled"> Save and close</button>');

			dialogSaveButton = $('#saveItem', dialogBtn);
			saveAndClose = $('#saveAndClose', dialogBtn);

			var typeInfo = {};
			Command.getSchemaInfo(entity.type, function(schemaInfo) {
				$(schemaInfo).each(function(i, prop) {
					typeInfo[prop.jsonName] = prop;
				});
			});

			Command.query('SchemaNode', 1, 1, 'name', 'asc', { name: entity.type }, function(schemaNodes) {

				schemaNodes[0].schemaProperties.reverse().forEach(function(prop) {

					dialogText.append('<div id="prop-' + prop.id + '" class="prop"><label for="' + prop.id + '"><h3>' + formatKey(prop.name) + '</h3></label></div>');
					var div = $('#prop-' + prop.id);


					var key = prop.name;
					var isReadOnly = typeInfo[key].isReadOnly;
					var isSystem   = typeInfo[key].system;
					//var isPassword = (typeInfo[key].className === 'org.structr.core.property.PasswordProperty');

					var oldVal = entity[key];

					if (prop.propertyType === 'Boolean') {

						div.removeClass('value').append('<div class="value-container"><input type="checkbox" class="' + key + '_"></div>');
						var checkbox = div.find('input[type="checkbox"].' + key + '_');
						Command.getProperty(entity.id, key, function(val) {
							if (val) {
								checkbox.prop('checked', true);
							}
							if ((!isReadOnly || isAdmin) && !isSystem) {
								checkbox.on('change', function() {
									var checked = checkbox.prop('checked');
									_Contents.checkValueHasChanged(oldVal, checked || false, [dialogSaveButton, saveAndClose]);
								});
							} else {
								checkbox.prop('disabled', 'disabled');
								checkbox.addClass('readOnly');
								checkbox.addClass('disabled');
							}
						});
					} else if (prop.propertyType === 'Date' && !isReadOnly) {

						$.get(rootUrl + '_schema/' + entity.type + '/ui', function(data) {

							var typeInfo = data.result.filter(function(obj) { return obj.jsonName === prop.name; })[0];

							//console.log(typeInfo.format);
							div.append('<div class="value-container"></div>');
							_Entities.appendDatePicker($('.value-container', div), entity, prop.name, typeInfo.format);
							var valueInput = $('.value-container input', div);
							valueInput.on('change', function(e) {
								if (e.keyCode !== 27) {
									Command.get(entity.id, function(newEntity) {
										_Contents.checkValueHasChanged(newEntity[prop.name], valueInput.val() || null, [dialogSaveButton, saveAndClose]);
									});
								}
							});
						});

					} else {

						if (prop.contentType && prop.contentType === 'text/html') {
							div.append('<div class="value-container edit-area">' + (oldVal || '') + '</div>');
							var editArea = $('.edit-area', div);
							editArea.trumbowyg({
								//btns: ['strong', 'em', '|', 'insertImage'],
								//autogrow: true
							}).on('tbwchange', function() {
								Command.get(entity.id, function(newEntity) {
									_Contents.checkValueHasChanged(newEntity[prop.name], editArea.trumbowyg('html') || null, [dialogSaveButton, saveAndClose]);
								});
							}).on('tbwpaste', function() {
								Command.get(entity.id, function(newEntity) {
									_Contents.checkValueHasChanged(newEntity[prop.name], editArea.trumbowyg('html') || null, [dialogSaveButton, saveAndClose]);
								});
							});

						} else {
							div.append('<div class="value-container"><input value="' + (oldVal || '') + '">');
							var valueInput = $('.value-container input', div);
							valueInput.on('keyup', function(e) {

								if (e.keyCode !== 27) {
									Command.get(entity.id, function(newEntity) {
										_Contents.checkValueHasChanged(newEntity[prop.name], valueInput.val() || null, [dialogSaveButton, saveAndClose]);
									});
								}
							});
						}
					}
				});

				schemaNodes[0].relatedTo.reverse().forEach(function(prop) {

					var key = prop.targetJsonName;

					var type = typeInfo[key].type;
					var isRelated    = false;
					var isCollection = false;

					if (type) {
						isRelated = typeInfo[key].relatedType;
						if (isRelated) {
							isCollection = typeInfo[key].isCollection;
						}
					}

					if (isRelated) {

						dialogText.append('<div id="prop-' + prop.id + '" class="prop"><label for="' + prop.id + '"><h3>' + formatKey(key) + '</h3></label><i class="add ' + _Icons.getFullSpriteClass(_Icons._Icons.add_grey_icon) + '" /><div class="related-nodes"></div></div>');
						var div = $('#prop-' + prop.id);
						div.prepend();
						div.children('.add').on('click', function() {
							Structr.dialog('Add ' + typeInfo[key].type, function() {
							}, function() {
								_Contents.editItem(item);
							});
							_Entities.displaySearch(entity.id, key, typeInfo[key].type, dialogText, isCollection);
						});

						if (entity[key]) {

							var relatedNodes = $('.related-nodes', div);

							if (!isCollection) {

								var nodeId = entity[key].id || entity[key];

								Command.get(nodeId, function(node) {

									_Entities.appendRelatedNode(relatedNodes, node, function(nodeEl) {

										$('.remove', nodeEl).on('click', function(e) {
											e.preventDefault();
											_Entities.setProperty(entity.id, key, null, false, function(newVal) {
												if (!newVal) {
													blinkGreen(relatedNodes);
													Structr.showAndHideInfoBoxMessage('Related node "' + (node.name || node.id) + '" was removed from property "' + key + '".', 'success', 2000, 1000);
													nodeEl.remove();
												} else {
													blinkRed(relatedNodes);
												}
											});
											return false;
										});

									});

								});

							} else {

								entity[key].forEach(function(obj) {

									var nodeId = obj.id || obj;

									Command.get(nodeId, function(node) {

										_Entities.appendRelatedNode(relatedNodes, node, function(nodeEl) {
											$('.remove', nodeEl).on('click', function(e) {
												e.preventDefault();
												Command.removeFromCollection(entity.id, key, node.id, function() {
													var nodeEl = $('._' + node.id, relatedNodes);
													nodeEl.remove();
													blinkGreen(relatedNodes);
													Structr.showAndHideInfoBoxMessage('Related node "' + (node.name || node.id) + '" was removed from property "' + key + '".', 'success', 2000, 1000);
												});
												return false;
											});
										});
									});

								});

							}

						}
					}
				});

			}, true);

			dialogSaveButton.on('click', function(e) {

				ignoreKeyUp = false;

				e.preventDefault();
				e.stopPropagation();

				Command.query('SchemaNode', 1, 1, 'name', 'asc', { name: entity.type }, function(schemaNodes) {

					schemaNodes[0].schemaProperties.forEach(function(prop) {

						var newVal;
						var oldVal = entity[prop.name];

						if (true) {

							if (prop.contentType && prop.contentType === 'text/html') {
								newVal = $('#prop-' + prop.id + ' .edit-area').trumbowyg('html') || null;
							} else if (prop.propertyType === 'Boolean') {
								newVal = $('#prop-' + prop.id + ' .value-container input').prop('checked') || false;
							} else {
								newVal = $('#prop-' + prop.id + ' .value-container input').val() || null;
							}

							//console.log(prop.name, 'Old value:', oldVal, 'New value:', newVal);

							if (newVal !== oldVal) {

								Command.setProperty(entity.id, prop.name, newVal, false, function() {

									oldVal = newVal;
									dialogSaveButton.prop("disabled", true).addClass('disabled');
									saveAndClose.prop("disabled", true).addClass('disabled');

									// update title in list
									if (prop.name === 'title') {
										var f = $('#row' + entity.id + ' .item-title b');
										f.text(fitStringToWidth(newVal, 200));
										blinkGreen(f);
									}
								});

							}
						}

					});

				}, true);

				dialogSaveButton.prop("disabled", true).addClass('disabled');
				saveAndClose.prop("disabled", true).addClass('disabled');
			});

			saveAndClose.on('click', function(e) {
				e.stopPropagation();
				dialogSaveButton.click();
				setTimeout(function() {
					dialogSaveButton.remove();
					saveAndClose.remove();
					dialogCancelButton.click();
				}, 500);
			});

		});

	},
	appendEditFileIcon: function(parent, item) {

		var editIcon = $('.edit_file_icon', parent);

		if (!(editIcon && editIcon.length)) {
			parent.append('<i title="Edit ' + item.name + ' [' + item.id + ']" class="edit_file_icon button ' + _Icons.getFullSpriteClass(_Icons.edit_icon) + '" />');
		}

		$(parent.children('.edit_file_icon')).on('click', function(e) {
			e.stopPropagation();

			_Contents.editItem(item);

		});
	},
	displaySearchResultsForURL: function(url) {

		$('#search-results').remove();
		contentsContents.append('<div id="search-results"></div>');

		var searchString = $('.search', main).val();
		var container = $('#search-results');
		contentsContents.on('scroll', function() {
			window.history.pushState('', '', '#contents');

		});

		$.ajax({
			url: url,
			statusCode: {
				200: function(data) {

					if (!data.result || data.result.length === 0) {
						container.append('<h1>No results for "' + searchString + '"</h1>');
						container.append('<h2>Press ESC or click <a href="#contents" class="clear-results">here to clear</a> empty result list.</h2>');
						$('.clear-results', container).on('click', function() {
							_Contents.clearSearch();
						});
						return;
					} else {
						container.append('<h1>' + data.result.length + ' search results:</h1><table class="props"><thead><th class="_type">Type</th><th>Name</th><th>Size</th></thead><tbody></tbody></table>');
						data.result.forEach(function(d) {
							var icon = _Contents.getIcon(d);
							$('tbody', container).append('<tr><td><i class="fa ' + icon + '"></i> ' + d.type + (d.isFile && d.contentType ? ' (' + d.contentType + ')' : '') + '</td><td><a href="#results' + d.id + '">' + d.name + '</a></td><td>' + d.size + '</td></tr>');

						});
					}

					data.result.forEach(function(d) {

						$.ajax({
							url: rootUrl + 'files/' + d.id + '/getSearchContext',
							contentType: 'application/json',
							method: 'POST',
							data: JSON.stringify({searchString: searchString, contextLength: 30}),
							statusCode: {
								200: function(data) {

									if (!data.result) return;

									//console.log(data.result);

									container.append('<div class="search-result collapsed" id="results' + d.id + '"></div>');

									var div = $('#results' + d.id);
									var icon = _Contents.getIcon(d);
									div.append('<h2><i class="fa ' + icon + '"></i> ' + d.name + '<i id="preview' + d.id + '" class="' + _Icons.getFullSpriteClass(_Icons.eye_icon) + '" style="margin-left: 6px;" title="' + d.extractedContent + '" /></h2>');
									div.append('<i class="toggle-height fa fa-expand"></i>').append('<i class="go-to-top fa fa-chevron-up"></i>');

									$('.toggle-height', div).on('click', function() {
										var icon = $(this);
										div.toggleClass('collapsed');
										if (icon.hasClass('fa-expand')) {
											icon.removeClass('fa-expand');
											icon.addClass('fa-compress');
										} else {
											icon.removeClass('fa-compress');
											icon.addClass('fa-expand');
										}

									});

									$('.go-to-top', div).on('click', function() {
										content.scrollTop(0);
										window.history.pushState('', '', '#contents');
									});

									$.each(data.result.context, function(i, contextString) {

										searchString.split(/[\s,;]/).forEach(function(str) {
											contextString = contextString.replace(new RegExp('(' + str + ')', 'gi'), '<span class="highlight">$1</span>');
										});

										div.append('<div class="part">' + contextString + '</div>');

									});

									div.append('<div style="clear: both;"></div>');
								}
							}
						});

					});
				}
			}

		});
	},
	getIcon: function(file) {
		return (file.isContentContainer ? 'fa-folder-o' : 'fa-file-o');
	}
};
