Momo.style = {};
Momo.style.tagList = [];  // global variable of tag_list
Momo.style.styleTagListOrgin = [];  // global variable of orgin style tag
Momo.style.tagNameDict = {};
Momo.style.tagIdDict = {};


Momo.postInitUser = function() {
  Momo.style.bindEvent();
  Momo.style.getInitStyleInfo();
};


// get and manipulate all the style_tag info for this page
Momo.style.getInitStyleInfo = function() {
  var url = '/api/admin_style_tag';
  var data = {
    'cmd' : 'list'
  };
  Momo.ajaxRequest(url, data, Momo.style.success);
};


//ajax success
Momo.style.success = function(resp) {
  Momo.style.tagList = resp.tag_list;
  Momo.style.generateTagDict();
  var styleList = resp.style_tag_list;
  Momo.style.styleTagListOrgin = styleList.slice(0);
  var tblCont = $("#tag_tbl_content");
  var s = [];
  for (var i = 0; i < styleList.length; i++) {
    s.push('<tr>');
    // 显示style名称
    s.push('<td class="td_style_name"><span class="style_name" sid="' + styleList[i].sid + '" new_list="' + styleList[i].tag_list + '">' + styleList[i].style_name + '<span></td>');
    // 显示style对应的标签列表
    s.push('<td class="tag_list">' + Momo.style.showStyleTagList(styleList[i].tag_list) + '</td>');
    // 显示添加标签未包含标签
    s.push('<td class="td_add_tag">' + Momo.style.showTagOption(styleList[i].tag_list) + '<button class="tag_add_btn">添加</button>');
    // 有改动，显示save 和 cancel按钮
    s.push('<span class="do_modify_span"><span class="save_span">Save</span><span class="cancel_span">Cancel</span></span></td>');
    s.push('</tr>');
  }
  tblCont.html(s.join(''));
};


//bind element's event manually
Momo.style.bindEvent = function() {
  // tag span mouse hover
  $(".span_tag").live("mouseenter mouseleave", function() {
    $(this).toggleClass("on");
  }).live("click", Momo.style.bindTagClick); // tag lable click

  // add button click
  $(".tag_add_btn").live("click", Momo.style.bindAddBtn);

  // Save button click
  $('.save_span').live('click', Momo.style.bindSaveBtn);

  // Cancel button click
  $('.cancel_span').live('click', Momo.style.bindCancelBtn);

  // add style button click
  $('#btn_add_style').live('click', Momo.style.bindAddStyleBtn);
};


/* manipulate style tag list for the current style
 * Args:
 *    styleTagList: (list) a list contains tag's id
 * Returns:
 *     s: (string) return the assembled html content of tag list
 */
Momo.style.showStyleTagList = function(styleTagList) {
  var s = [];
  for (var i = 0; i < styleTagList.length; i++) {
    s.push('<span class="span_tag" title="删除此tag">' + Momo.style.tagIdDict[styleTagList[i]] + '</span>');
  }
  return s.join('');
};


/* generate id and name dict */
Momo.style.generateTagDict = function() {
  for(var i = 0; i < Momo.style.tagList.length; i++) {
    Momo.style.tagIdDict[Momo.style.tagList[i]._id] = Momo.style.tagList[i].name;
    Momo.style.tagNameDict[Momo.style.tagList[i].name] = Momo.style.tagList[i]._id;
  }
};


/* manipulate tag option for the current style
 * Args:
 *     styleTagList: (list) list contains the tag id of style
 * Returns:
 *     s: (string)  html string of optional tags
 */
Momo.style.showTagOption = function(styleTagList) {
  var s = ['<span class="add_tag"><select class="tag_select"><option>选择tag</option>'];
  for (var i = 0; i < Momo.style.tagList.length; i++) {
    if ($.inArray(Momo.style.tagList[i]._id, styleTagList) === -1) {
      s.push('<option>' + Momo.style.tagList[i].name + '</option>');
    }
  }
  s.push('</select></span>');
  return s.join('');
};


/* get the orgin tag list from the global style list container
 * Args:
 *     sid: (int) style id
 * Returns:
 *     orginTagList: (list) contains of the origin tag list of the style
 */
Momo.style.getOrginTagList = function(sid) {
  var orginTagList = [];
  for (var i = 0; i < Momo.style.styleTagListOrgin.length; i++) {
    if (Momo.style.styleTagListOrgin[i].sid === sid) {
      originTagList = Momo.style.styleTagListOrgin[i].tag_list;
      return originTagList.slice(0);
    }
  }
  return orginTagList;
};


/* check if the style has been changedstyleid
 * Args:
 *     sid: (int) the style id
 *     newTagList: (string) a string of list for tag list,splited by ','
 * Returns:
 *     boolean: true if tag list changed;otherwise return false
 */
Momo.style.isModified = function(sid, newTagList) {
  newTagList = newTagList.split(',');
  newTagList = Momo.style.parseStringListToIntList(newTagList);
  var originTagList = [];
  if (!isNaN(sid)) {// new add style doesn't have sid attribute
    originTagList = Momo.style.getOrginTagList(sid);
  } else {
    return true;
  }
  if (originTagList.length !== newTagList.length) {
    return true;
  }
  for (var i = 0; i < newTagList.length; i++) {
    if ($.inArray(newTagList[i], originTagList) === -1) {
      return true;
    }
  }
  return false;
};


/* parse string element of list to int element list
 * Args:
 *     stringList: (list) a list contains string element
 * Returns:
 *     list contains converted intger elements
 */
Momo.style.parseStringListToIntList = function (stringList) {
  if (stringList.length === 1 && stringList[0] === '') {
    return [];
  }
  var intList = [];
  for (var i = 0; i < stringList.length; i++) {
    intList.push(parseInt(stringList[i]));
  }
  return intList.slice(0);
};


/* remove the id from list container
 * Args:styleid
 *     tid: (int) tag id
 *     tagStringList: (string) a string of list for tag list,splited by ','
 * Returns:
 *      newTagStringList: (string) a stringof list for tag list,splited by ','
 */
Momo.style.removeIdFromStringList = function(tid, tagStringList) {
  var newTagStringList = '';
  tagStringList = tagStringList.split(',');
  var tagList = Momo.style.parseStringListToIntList(tagStringList);
  if ($.inArray(tid, tagList) !== -1) {
    tagList.splice(tagList.indexOf(tid), 1);
  }
  newTagStringList = tagList.join(',');
  return newTagStringList;
};


/* add the id to the list container
 * Args:
 *     tid: (int) tag id
 *     tagStringList: (list) a list contains string tag id
 * Returns:
 *     newTagStringList: (string) a stringof list for tag list,splited by ','
 */
Momo.style.addIdToStringList = function(tid, tagStringList) {
  var newTagStringList = '';
  tagStringList = tagStringList.split(',');
  var tagList = Momo.style.parseStringListToIntList(tagStringList);
  if ($.inArray(tid, tagList) === -1) {
    tagList.push(tid);
  };
  newTagStringList = tagList.join(',');
  return newTagStringList;
};


/*=====================event bind============================*/
/* bind click event for every single tag */
Momo.style.bindTagClick = function() {
  // get tag id
  var tagName = $(this).text();
  var tid = Momo.style.tagNameDict[tagName];
  // set new_list
  var styleSpan = $(this).parent().prev(".td_style_name").children('.style_name:first');
  var newList = styleSpan.attr('new_list');
  newList = Momo.style.removeIdFromStringList(tid, newList);
  styleSpan.attr('new_list', newList);
  // update tag_select options
  $(this).parent().next('td').children('.add_tag:first').replaceWith(Momo.style.showTagOption(Momo.style.parseStringListToIntList(newList.split(','))));
  // show or hide the Save(Cancel) button
  var sid = parseInt(styleSpan.attr('sid'));
  if (Momo.style.isModified(sid, newList)) {
    $(this).parent().next('td').children('.do_modify_span:first').show();
  } else {
    $(this).parent().next('td').children('.do_modify_span:first').hide();
  }
  // remove this tag
  $(this).remove();
};


/* bind click event for add btn*/
Momo.style.bindAddBtn = function() {
  // check if the select is not default
  var select = $(this).prev().children('.tag_select:first');
  // get the tag id
  var tname = select.val();
  if (tname === "选择tag") {
    window.alert('请选择一个标签');
    return false;
  }
  var tid = Momo.style.tagNameDict[tname];
  // set new_list
  var styleSpan = $(this).parent().prevAll(".td_style_name:first").children('.style_name:first');
  var newList = styleSpan.attr('new_list');
  newList = Momo.style.addIdToStringList(tid, newList);
  styleSpan.attr('new_list', newList);
  // update the tags
  $(this).parent().prev('.tag_list:first').html(Momo.style.showStyleTagList(Momo.style.parseStringListToIntList(newList.split(','))));
  // update tag_select options
  $(this).prev().replaceWith(Momo.style.showTagOption(Momo.style.parseStringListToIntList(newList.split(','))));
  // show or hide the Save(Cancel) button
  var sid = parseInt(styleSpan.attr('sid'));
  if (Momo.style.isModified(sid, newList)) {
    $(this).next('.do_modify_span:first').show();
  } else {
    $(this).next('.do_modify_span:first').hide();
  }
};


/* bind click event for Save btn */
Momo.style.bindSaveBtn = function () {
  var styleSpan = $(this).parent().parent().prevAll('.td_style_name:first').children('.style_name:first');
  // get style id
  var styleid = styleSpan.attr('sid');
  // get style name
  var stylename = styleSpan.text();
  // get tag list
  var taglist = styleSpan.attr('new_list');
  if (taglist === '') {
    window.alert('请至少选择一个标签');
    return false;
  }
  // save
  var url = '/api/admin_style_tag';
  var data = {
    'cmd' : 'edit'
  };
  if ( typeof (styleid) !== 'undefined') {
    data['styleid'] = styleid;
  }
  data['stylename'] = stylename;
  data['taglist'] = taglist;
  if(!window.confirm('确认修改？')){
    return false;
  }
  Momo.ajaxRequest(url, data, function() {
    // reflesh table content after update successfully
    Momo.style.getInitStyleInfo();
  });
};


/* bind click event for Cancel btn */
Momo.style.bindCancelBtn = function () {
  // get the style id
  var spanStyle = $(this).parent().parent().prevAll('.td_style_name:first').children('.style_name:first');
  // if sid is 'undifined',remove the current <tr>,return
  var sid = spanStyle.attr('sid');
  if ( typeof (sid) === 'undefined') {
    spanStyle.parent().parent('tr:first').remove();
    return false;
  }
  // if sid is a certain number of style id
  var sid = parseInt(sid);
  // revert new_list
  var orginList = Momo.style.getOrginTagList(sid);
  spanStyle.attr('new_list', orginList.join(','));
  // revert tag_list
  spanStyle.parent().next('.tag_list:first').html(Momo.style.showStyleTagList(orginList));
  // revert select_tag
  spanStyle.parent().next().next('.td_add_tag:first').children('.add_tag:first').replaceWith(Momo.style.showTagOption(orginList));
  // show do_modify_span, or not
  $(this).parent().hide();
};


/* bind click event for add style button */
Momo.style.bindAddStyleBtn = function() {
  // get style name
  var inputStyle = $(this).prev();
  var newStyleName = $.trim(inputStyle.val());
  // check if name already exists
  if (!newStyleName) {
    window.alert('请输入风格名称');
    inputStyle.select();
    return false;
  }
  var flag = false;
  $('#tag_tbl_content .style_name').each(function() {
    if ($.trim($(this).text()) === newStyleName) {
      flag = true;
    }
  });
  if (flag) {
    window.alert('风格名称重复');
    inputStyle.select();
    return false;
  }
  // create a new tr
  var s = ['<tr>'];
  // 显示style名称
  s.push('<td class="td_style_name"><span class="style_name" new_list="">' + newStyleName + '<span></td>');
  // 显示style对应的标签列表
  s.push('<td class="tag_list"></td>');
  // 显示添加标签未包含标签
  s.push('<td class="td_add_tag">' + Momo.style.showTagOption([]) + '<button class="tag_add_btn">添加</button>');
  // 有改动，显示save 和 cancel按钮
  s.push('<span class="do_modify_span" style="display:block;"><span class="save_span">Save</span><span class="cancel_span">Cancel</span></span></td>');
  s.push('</tr>');
  $('#tag_tbl_content').append(s.join(''));
  // empty the input
  inputStyle.val('');
};
